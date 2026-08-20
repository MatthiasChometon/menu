import { BadRequestException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/currentUser/current-user';
import { AuthGuard } from '../auth/currentUser/guard';
import { NutritionTargetsService } from '../profile/targets.service';
import { User } from '../user/model';
import { HouseholdMemberInput, UpdateHouseholdMemberInput } from './input';
import { HouseholdMember } from './model';
import { HouseholdRepository } from './repository';
import { MemberRecord } from './type';
import { householdConstraints } from './utils';

@Resolver(() => HouseholdMember)
@UseGuards(AuthGuard)
export class HouseholdResolver {
  constructor(
    private readonly members: HouseholdRepository,
    private readonly targets: NutritionTargetsService,
  ) {}

  @Query(() => [HouseholdMember], {
    description: 'Everybody the signed-in user cooks for, besides themselves.',
  })
  async householdMembers(@CurrentUser() user: User): Promise<HouseholdMember[]> {
    const records = await this.members.findByOwner(user.id);

    return records.map((record): HouseholdMember => this.withTargets(record));
  }

  @Mutation(() => HouseholdMember)
  async addHouseholdMember(
    @CurrentUser() user: User,
    @Args('input') input: HouseholdMemberInput,
  ): Promise<HouseholdMember> {
    const { maxMembers } = householdConstraints();
    if ((await this.members.countByOwner(user.id)) >= maxMembers) {
      throw new BadRequestException(`A household holds at most ${maxMembers} people.`);
    }

    return this.withTargets(await this.members.add(user.id, input));
  }

  @Mutation(() => HouseholdMember, { description: 'Replaces a member wholesale.' })
  async updateHouseholdMember(
    @CurrentUser() user: User,
    @Args('input') input: UpdateHouseholdMemberInput,
  ): Promise<HouseholdMember> {
    const { id, ...member } = input;
    const updated = await this.members.update(user.id, id, member);

    // Somebody else's member and a member that never existed answer the same
    // way on purpose: telling them apart would confirm that an identifier is
    // real to whoever asked.
    if (updated === undefined) throw new NotFoundException('No such member.');

    return this.withTargets(updated);
  }

  @Mutation(() => Boolean, { description: 'Removes a member. Their name stops appearing at once.' })
  async removeHouseholdMember(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    if (!(await this.members.remove(user.id, id))) throw new NotFoundException('No such member.');

    return true;
  }

  // Derived on read rather than stored, like the account holder's own: a copy
  // in the row would drift the day a coefficient changes.
  private withTargets(record: MemberRecord): HouseholdMember {
    return { ...record, targets: this.targets.calculate(record) };
  }
}
