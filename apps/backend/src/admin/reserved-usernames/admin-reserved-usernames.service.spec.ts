import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError, type Repository } from 'typeorm';
import type { ReservedUsername } from '../../users/reserved-username.entity';
import type { User } from '../../users/user.entity';
import { AdminReservedUsernamesService } from './admin-reserved-usernames.service';

describe('AdminReservedUsernamesService', () => {
  const actor = { id: 'admin-id' } as User;
  let reserved: { insert: jest.Mock; delete: jest.Mock };
  let users: { existsBy: jest.Mock };
  let service: AdminReservedUsernamesService;

  beforeEach(() => {
    reserved = { insert: jest.fn(), delete: jest.fn() };
    users = { existsBy: jest.fn().mockResolvedValue(false) };
    service = new AdminReservedUsernamesService(
      reserved as unknown as Repository<ReservedUsername>,
      users as unknown as Repository<User>,
    );
  });

  it('reserves a free username with its author', async () => {
    await service.reserve(actor, { username: 'kilotrace', category: 'brand' });
    expect(reserved.insert).toHaveBeenCalledWith({
      username: 'kilotrace',
      category: 'brand',
      note: null,
      createdById: 'admin-id',
    });
  });

  it('refuses a username held by an account', async () => {
    users.existsBy.mockResolvedValue(true);
    await expect(
      service.reserve(actor, { username: 'marie', category: 'other' }),
    ).rejects.toMatchObject({ response: { code: 'USERNAME_TAKEN' } });
    expect(reserved.insert).not.toHaveBeenCalled();
  });

  it('refuses a username reserved already', async () => {
    reserved.insert.mockRejectedValue(
      new QueryFailedError('INSERT', [], {
        code: '23505',
        detail: 'Key (username)=(admin) already exists.',
      } as unknown as Error),
    );
    await expect(
      service.reserve(actor, { username: 'admin', category: 'system' }),
    ).rejects.toThrow(ConflictException);
  });

  it('reports the release of a username not reserved', async () => {
    reserved.delete.mockResolvedValue({ affected: 0 });
    await expect(service.release('nobody')).rejects.toThrow(NotFoundException);
  });
});
