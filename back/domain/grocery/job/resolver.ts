import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import { CurrentDevice } from '../device/current-device';
import { GroceryDeviceGuard } from '../device/guard';
import { type AuthenticatedDevice } from '../device/type';
import { GroceryJobStatus } from '../enum';
import { GroceryService } from '../service';
import { CreateGroceryJobInput, GroceryJobEventInput, GroceryJobOutcomeInput } from './input';
import { GroceryJob, GroceryJobEvent } from './model';

@Resolver(() => GroceryJob)
export class GroceryJobResolver {
  constructor(private readonly grocery: GroceryService) {}

  @Query(() => [GroceryJob], { description: 'Every run this account has asked for, newest first.' })
  @UseGuards(AuthGuard)
  async myGroceryJobs(@CurrentUser() user: User): Promise<GroceryJob[]> {
    return this.grocery.history(user.id);
  }

  @Query(() => GroceryJob, {
    nullable: true,
    description: 'One run with everything it reported, which is what the live view follows.',
  })
  @UseGuards(AuthGuard)
  async groceryJob(
    @CurrentUser() user: User,
    @Args('jobId', { type: () => ID }, ParseUUIDPipe) jobId: string,
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
    @Args('jobId', { type: () => ID }, ParseUUIDPipe) jobId: string,
    @Args('input') input: GroceryJobEventInput,
  ): Promise<GroceryJobEvent> {
    return this.grocery.reportEvent(jobId, device.id, input);
  }

  @Mutation(() => GroceryJob, { description: 'Closes a run, whatever became of it.' })
  @UseGuards(GroceryDeviceGuard)
  async finishGroceryJob(
    @CurrentDevice() device: AuthenticatedDevice,
    @Args('jobId', { type: () => ID }, ParseUUIDPipe) jobId: string,
    @Args('input') input: GroceryJobOutcomeInput,
  ): Promise<GroceryJob> {
    return this.grocery.close({
      jobId,
      deviceId: device.id,
      userId: device.userId,
      status: GroceryJobStatus[input.outcome],
      report: input,
      missingFoodIds: input.missingFoodIds,
      observations: input.observations,
    });
  }
}
