import { BadRequestException, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
// Decorated signatures need type-only imports under isolatedModules +
// emitDecoratorMetadata, otherwise TS1272.
import type { FastifyRequest } from 'fastify';
import { AdminGuard } from '../auth/admin/guard';
import { AuthGuard } from '../auth/currentUser/guard';
import { SkipTimeout } from '../../infrastructure/http/request-timeout.interceptor';
import { ImageParams } from './params';
import { ImageLibraryService } from './service';

// REST rather than GraphQL: a photograph arrives as multipart, which GraphQL
// carries only through an extra specification and an extra client library.
//
// AuthGuard first — it is what puts the user on the request for AdminGuard to
// read. Reversed, the second would find nobody and refuse everyone.
@Controller('images')
// The global 30 s answer would not stop the conversion: the caller would resend
// a photograph the first attempt still commits. The 8 MB limit bounds the work.
@SkipTimeout()
@UseGuards(AuthGuard, AdminGuard)
export class ImageLibraryController {
  constructor(private readonly images: ImageLibraryService) {}

  @Post(':kind/:id')
  async upload(
    @Param() { kind, id }: ImageParams,
    @Req() request: FastifyRequest,
  ): Promise<{ kind: string; id: string; file: string }> {
    const upload = await request.file();
    if (upload === undefined) {
      throw new BadRequestException('Send the photograph as a file field.');
    }

    // toBuffer() throws once the configured size limit is passed, which is what
    // stops somebody filling the disk one request at a time.
    const bytes = await upload.toBuffer().catch((): never => {
      throw new BadRequestException('That photograph is too large.');
    });

    return { kind, id, file: await this.images.store(kind, id, bytes) };
  }
}
