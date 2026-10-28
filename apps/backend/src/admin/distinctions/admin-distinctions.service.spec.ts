import { ConflictException, NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import type { Distinction } from '../../users/distinction.entity';
import type { UserDistinction } from '../../users/user-distinction.entity';
import { AdminDistinctionsService } from './admin-distinctions.service';

describe('AdminDistinctionsService', () => {
  let distinctions: jest.Mocked<
    Pick<Repository<Distinction>, 'findOneBy' | 'delete'>
  >;
  let service: AdminDistinctionsService;

  beforeEach(() => {
    distinctions = { findOneBy: jest.fn(), delete: jest.fn() };
    service = new AdminDistinctionsService(
      distinctions as unknown as Repository<Distinction>,
      {} as Repository<UserDistinction>,
      {} as DataSource,
    );
  });

  it('deletes a distinction granted by hand', async () => {
    distinctions.findOneBy.mockResolvedValue({
      id: 'founder',
      system: false,
    } as Distinction);
    await service.delete('founder');
    expect(distinctions.delete).toHaveBeenCalledWith('founder');
  });

  it('keeps a distinction awarded by the application', async () => {
    distinctions.findOneBy.mockResolvedValue({
      id: 'team',
      system: true,
    } as Distinction);
    await expect(service.delete('team')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(distinctions.delete).not.toHaveBeenCalled();
  });

  it('refuses an unknown distinction', async () => {
    distinctions.findOneBy.mockResolvedValue(null);
    await expect(service.delete('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
