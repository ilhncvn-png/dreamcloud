import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaitlistEntry } from '../admin/entities/waitlist-entry.entity';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectRepository(WaitlistEntry)
    private readonly repo: Repository<WaitlistEntry>,
  ) {}

  async join(email: string): Promise<void> {
    const existing = await this.repo.findOne({ where: { email } });
    if (existing) throw new ConflictException('Bu e-posta zaten listede kayıtlı.');
    await this.repo.save(this.repo.create({ email }));
  }
}
