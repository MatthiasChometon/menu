import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/currentUser/current-user';
import { AuthGuard } from '../auth/currentUser/guard';
import { AdminGuard } from '../auth/admin/guard';
import { User } from '../user/model';
import { ImprovementImportance, ImprovementStatus } from './enum';
import { ImprovementStatusInput, RequestImprovementInput } from './input';
import { ImprovementRequest } from './model';
import { ImprovementRequestRepository, type RequestWithRequester } from './repository';
import { ImprovementRequestService } from './service';
import type { ImprovementRequestRecord } from './type';

const present = (
  record: ImprovementRequestRecord,
  requesterEmail: string | null,
): ImprovementRequest => ({
  id: record.id,
  importance: record.importance as ImprovementImportance,
  message: record.message,
  context: record.context,
  status: record.status as ImprovementStatus,
  requestedBy: requesterEmail,
  createdAt: record.createdAt.toISOString(),
});

@Resolver(() => ImprovementRequest)
export class ImprovementRequestResolver {
  constructor(
    private readonly service: ImprovementRequestService,
    private readonly requests: ImprovementRequestRepository,
  ) {}

  // Signed in, but nothing more: anybody using the site may ask for something,
  // and asking for a right first would silence exactly the ideas worth having.
  @Mutation(() => ImprovementRequest, { description: 'Suggests an improvement to the site.' })
  @UseGuards(AuthGuard)
  async requestImprovement(
    @CurrentUser() user: User,
    @Args('input') input: RequestImprovementInput,
  ): Promise<ImprovementRequest> {
    const record = await this.service.request(user, input);

    return present(record, user.email);
  }

  // Reuses the same administrators as the reports screen — one guest list for
  // everything an admin reads. AuthGuard first: it is what puts the user on the
  // request for AdminGuard to read.
  @Query(() => [ImprovementRequest], {
    description: 'Every suggestion, newest first. Administrators only.',
  })
  @UseGuards(AuthGuard, AdminGuard)
  async improvementRequests(): Promise<ImprovementRequest[]> {
    const records = await this.requests.findAll();

    return records.map((record: RequestWithRequester): ImprovementRequest =>
      present(record, record.requesterEmail),
    );
  }

  @Mutation(() => ImprovementRequest, {
    nullable: true,
    description: 'Moves a suggestion along its life. Null when there is no such suggestion.',
  })
  @UseGuards(AuthGuard, AdminGuard)
  async setImprovementStatus(
    @Args('input') input: ImprovementStatusInput,
  ): Promise<ImprovementRequest | undefined> {
    const record = await this.requests.setStatus(input.id, input.status);

    return record === undefined ? undefined : present(record, null);
  }
}
