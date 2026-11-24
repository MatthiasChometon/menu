import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { WeightRepository } from './repository';
import type { WeightEntryDraft, WeightEntryRecord } from './type';
import { todayDate } from './utils';

@Injectable()
export class WeightService {
  constructor(private readonly entries: WeightRepository) {}

  mine(userId: string): Promise<WeightEntryRecord[]> {
    return this.entries.findByUser(userId);
  }

  add(userId: string, entry: WeightEntryDraft): Promise<WeightEntryRecord> {
    this.assertNotFuture(entry.date);

    return this.entries.add(userId, entry);
  }

  async replace(userId: string, id: string, entry: WeightEntryDraft): Promise<WeightEntryRecord> {
    this.assertNotFuture(entry.date);
    const updated = await this.entries.update(userId, id, entry);

    // Somebody else's entry and one that never existed answer the same way on
    // purpose: telling them apart would confirm that an identifier is real to
    // whoever asked.
    if (updated === undefined) throw new NotFoundException('No such weigh-in.');

    return updated;
  }

  async remove(userId: string, id: string): Promise<void> {
    if (!(await this.entries.remove(userId, id))) throw new NotFoundException('No such weigh-in.');
  }

  private assertNotFuture(date: string): void {
    if (date > todayDate()) {
      throw new BadRequestException('A weigh-in cannot be logged in the future.');
    }
  }
}
