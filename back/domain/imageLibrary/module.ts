import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { ImageLibraryController } from './controller';
import { ImageLibraryService } from './service';

@Module({
  imports: [AuthModule],
  controllers: [ImageLibraryController],
  providers: [ImageLibraryService],
})
export class ImageLibraryModule {}
