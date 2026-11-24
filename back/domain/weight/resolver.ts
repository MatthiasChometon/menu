import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/currentUser/current-user';
import { AuthGuard } from '../auth/currentUser/guard';
import { User } from '../user/model';
import { UpdateWeightEntryInput, WeightEntryInput } from './input';
import { WeightEntry } from './model';
import { WeightService } from './service';

@Resolver(() => WeightEntry)
@UseGuards(AuthGuard)
export class WeightResolver {
  constructor(private readonly entries: WeightService) {}

  @Query(() => [WeightEntry], { description: 'Every weigh-in the signed-in user has logged.' })
  async myWeightEntries(@CurrentUser() user: User): Promise<WeightEntry[]> {
    return this.entries.mine(user.id);
  }

  @Mutation(() => WeightEntry)
  async addWeightEntry(
    @CurrentUser() user: User,
    @Args('input') input: WeightEntryInput,
  ): Promise<WeightEntry> {
    return this.entries.add(user.id, input);
  }

  @Mutation(() => WeightEntry, { description: 'Replaces a logged weigh-in wholesale.' })
  async updateWeightEntry(
    @CurrentUser() user: User,
    @Args('input') input: UpdateWeightEntryInput,
  ): Promise<WeightEntry> {
    const { id, ...entry } = input;

    return this.entries.replace(user.id, id, entry);
  }

  @Mutation(() => Boolean, { description: 'Removes a weigh-in from the diary.' })
  async deleteWeightEntry(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<boolean> {
    await this.entries.remove(user.id, id);

    return true;
  }
}
