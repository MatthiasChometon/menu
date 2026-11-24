import { BadRequestException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/currentUser/current-user';
import { AuthGuard } from '../auth/currentUser/guard';
import { User } from '../user/model';
import { UpdateWeightEntryInput, WeightEntryInput } from './input';
import { WeightEntry } from './model';
import { WeightRepository } from './repository';
import { todayDate } from './utils';

@Resolver(() => WeightEntry)
@UseGuards(AuthGuard)
export class WeightResolver {
  constructor(private readonly entries: WeightRepository) {}

  @Query(() => [WeightEntry], { description: 'Every weigh-in the signed-in user has logged.' })
  async myWeightEntries(@CurrentUser() user: User): Promise<WeightEntry[]> {
    return this.entries.findByUser(user.id);
  }

  @Mutation(() => WeightEntry)
  async addWeightEntry(
    @CurrentUser() user: User,
    @Args('input') input: WeightEntryInput,
  ): Promise<WeightEntry> {
    this.assertNotFuture(input.date);

    return this.entries.add(user.id, input);
  }

  @Mutation(() => WeightEntry, { description: 'Replaces a logged weigh-in wholesale.' })
  async updateWeightEntry(
    @CurrentUser() user: User,
    @Args('input') input: UpdateWeightEntryInput,
  ): Promise<WeightEntry> {
    this.assertNotFuture(input.date);

    const { id, ...entry } = input;
    const updated = await this.entries.update(user.id, id, entry);
    // Somebody else's entry and one that never existed answer the same way on
    // purpose: telling them apart would confirm that an identifier is real to
    // whoever asked.
    if (updated === undefined) throw new NotFoundException('No such weigh-in.');

    return updated;
  }

  @Mutation(() => Boolean, { description: 'Removes a weigh-in from the diary.' })
  async deleteWeightEntry(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    if (!(await this.entries.remove(user.id, id))) throw new NotFoundException('No such weigh-in.');

    return true;
  }

  private assertNotFuture(date: string): void {
    if (date > todayDate()) {
      throw new BadRequestException('A weigh-in cannot be logged in the future.');
    }
  }
}
