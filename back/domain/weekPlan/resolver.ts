import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/currentUser/current-user';
import { AuthGuard } from '../auth/currentUser/guard';
import { User } from '../user/model';
import { WeekPlanInput } from './input';
import { WeekPlan } from './model';
import { WeekPlanRepository } from './repository';
import type { WeekPlanRecord } from './type';

// Every operation here is scoped to the signed-in user by construction: the week
// is read and written under their id, never under one the caller supplies. That
// is what keeps one account's plan out of another's reach.
@Resolver(() => WeekPlan)
@UseGuards(AuthGuard)
export class WeekPlanResolver {
  constructor(private readonly plans: WeekPlanRepository) {}

  @Query(() => WeekPlan, {
    nullable: true,
    description: 'The signed-in user plan for that week, or null if they never composed one.',
  })
  async myWeekPlan(
    @CurrentUser() user: User,
    @Args('weekOf') weekOf: string,
  ): Promise<WeekPlan | undefined> {
    return this.present(await this.plans.findOne(user.id, weekOf));
  }

  @Query(() => [WeekPlan], { description: 'Every week the signed-in user has composed.' })
  async myWeekPlans(@CurrentUser() user: User): Promise<WeekPlan[]> {
    const records = await this.plans.findAll(user.id);

    return records.map((record): WeekPlan => this.present(record) as WeekPlan);
  }

  @Mutation(() => WeekPlan, { description: 'Creates the plan for a week, or replaces it.' })
  async saveWeekPlan(
    @CurrentUser() user: User,
    @Args('input') input: WeekPlanInput,
  ): Promise<WeekPlan> {
    const saved = await this.plans.save(user.id, input.weekOf, input.days);

    return this.present(saved) as WeekPlan;
  }

  @Mutation(() => Boolean, { description: 'Forgets a week. False when there was none.' })
  async deleteWeekPlan(
    @CurrentUser() user: User,
    @Args('weekOf') weekOf: string,
  ): Promise<boolean> {
    return this.plans.remove(user.id, weekOf);
  }

  // Dates cross GraphQL as ISO strings: a Date would need a custom scalar for no
  // gain, and the front only ever displays it.
  private present(record: WeekPlanRecord | undefined): WeekPlan | undefined {
    return record === undefined
      ? undefined
      : { weekOf: record.weekOf, days: record.days, updatedAt: record.updatedAt.toISOString() };
  }
}
