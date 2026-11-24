import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomFoodRepository } from './repository';
import type { CustomFoodDraft, CustomFoodRecord } from './type';
import { customFoodConstraints } from './utils';

@Injectable()
export class CustomFoodService {
  constructor(private readonly foods: CustomFoodRepository) {}

  mine(userId: string): Promise<CustomFoodRecord[]> {
    return this.foods.findByOwner(userId);
  }

  async create(userId: string, food: CustomFoodDraft): Promise<CustomFoodRecord> {
    const { maxItems } = customFoodConstraints();
    const created = await this.foods.addUnlessFull(userId, food, maxItems);
    if (created === undefined) {
      throw new BadRequestException(`A pantry holds at most ${maxItems} foods.`);
    }

    return created;
  }

  async replace(userId: string, id: string, food: CustomFoodDraft): Promise<CustomFoodRecord> {
    const updated = await this.foods.update(userId, id, food);

    // Somebody else's food and one that never existed answer the same way on
    // purpose: telling them apart would confirm that an identifier is real to
    // whoever asked.
    if (updated === undefined) throw new NotFoundException('No such food.');

    return updated;
  }

  async remove(userId: string, id: string): Promise<void> {
    if (!(await this.foods.remove(userId, id))) throw new NotFoundException('No such food.');
  }
}
