import { ConflictException, NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import type { UserTag } from '../../users/user-tag.entity';
import type { UserTagAssignment } from '../../users/user-tag-assignment.entity';
import { AdminUserTagsService } from './admin-user-tags.service';

describe('AdminUserTagsService', () => {
  let userTags: jest.Mocked<Pick<Repository<UserTag>, 'findOneBy' | 'delete'>>;
  let service: AdminUserTagsService;

  beforeEach(() => {
    userTags = { findOneBy: jest.fn(), delete: jest.fn() };
    service = new AdminUserTagsService(
      userTags as unknown as Repository<UserTag>,
      {} as Repository<UserTagAssignment>,
      {} as DataSource,
    );
  });

  it('deletes a userTag granted by hand', async () => {
    userTags.findOneBy.mockResolvedValue({
      id: 'founder',
      system: false,
    } as UserTag);
    await service.delete('founder');
    expect(userTags.delete).toHaveBeenCalledWith('founder');
  });

  it('keeps a userTag awarded by the application', async () => {
    userTags.findOneBy.mockResolvedValue({
      id: 'team',
      system: true,
    } as UserTag);
    await expect(service.delete('team')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(userTags.delete).not.toHaveBeenCalled();
  });

  it('refuses an unknown userTag', async () => {
    userTags.findOneBy.mockResolvedValue(null);
    await expect(service.delete('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
