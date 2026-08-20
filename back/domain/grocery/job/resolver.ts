import { NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import { CurrentDevice } from '../device/current-device';
import { GroceryDeviceGuard } from '../device/guard';
import { type AuthenticatedDevice } from '../device/type';
import { GroceryJobStatus } from '../enum';
import { CreateGroceryJobInput, GroceryJobEventInput, GroceryJobOutcomeInput } from './input';
import { GroceryJob, GroceryJobEvent } from './model';
import { GroceryJobRepository } from './repository';
import { GroceryService } from '../service';

@Resolver(() => GroceryJob)
export class GroceryJobResolver {
  constructor(
    private readonly jobs: GroceryJobRepository,
    private readonly grocery: GroceryService,
  ) {}

  @Query(() => [GroceryJob], { description: 'Every run this account has asked for, newest first.' })
  @UseGuards(AuthGuard)
  async myGroceryJobs(@CurrentUser() user: User): Promise<GroceryJob[]> {
    return this.jobs.listForUser(user.id);
  }

  @Query(() => GroceryJob, {
    nullable: true,
    description: 'One run with everything it reported, which is what the live view follows.',
  })
  @UseGuards(AuthGuard)
  async groceryJob(
    @CurrentUser() user: User,
    @Args('jobId', { type: () => ID }) jobId: string,
  ): Promise<GroceryJob | undefined> {
    return this.grocery.detail(user.id, jobId);
  }

  @Mutation(() => GroceryJob, {
    description:
      'Queues a basket to be filled. It waits until a paired browser comes online, so asking from a phone works.',
  })
  @UseGuards(AuthGuard)
  async createGroceryJob(
    @CurrentUser() user: User,
    @Args('input') input: CreateGroceryJobInput,
  ): Promise<GroceryJob> {
    return this.grocery.queue(user.id, input.weekOf, input.needs);
  }

  @Mutation(() => GroceryJob, {
    nullable: true,
    description: 'Takes the oldest waiting run of the account this browser is paired with.',
  })
  @UseGuards(GroceryDeviceGuard)
  async claimGroceryJob(
    @CurrentDevice() device: AuthenticatedDevice,
  ): Promise<GroceryJob | undefined> {
    return this.grocery.claim(device.userId, device.id);
  }

  @Mutation(() => GroceryJobEvent, { description: 'Reports progress on a run being worked on.' })
  @UseGuards(GroceryDeviceGuard)
  async reportGroceryJobEvent(
    @CurrentDevice() device: AuthenticatedDevice,
    @Args('jobId', { type: () => ID }) jobId: string,
    @Args('input') input: GroceryJobEventInput,
  ): Promise<GroceryJobEvent> {
    const event = await this.jobs.appendEvent(jobId, device.id, input);
    if (event === undefined) {
      throw new NotFoundException();
    }

    return event;
  }

  @Mutation(() => GroceryJob, { description: 'Closes a run, whatever became of it.' })
  @UseGuards(GroceryDeviceGuard)
  async finishGroceryJob(
    @CurrentDevice() device: AuthenticatedDevice,
    @Args('jobId', { type: () => ID }) jobId: string,
    @Args('input') input: GroceryJobOutcomeInput,
  ): Promise<GroceryJob> {
    const job = await this.jobs.finish(jobId, device.id, GroceryJobStatus[input.outcome], input);
    if (job === undefined) {
      throw new NotFoundException();
    }

    return job;
  }
}
