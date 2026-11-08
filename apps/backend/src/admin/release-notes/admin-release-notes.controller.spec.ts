import { BadRequestException } from '@nestjs/common';
import type { User } from '../../users/user.entity';
import { AdminReleaseNotesController } from './admin-release-notes.controller';
import { UpdateReleaseNoteDto } from './admin-release-notes.dto';
import type { AdminReleaseNotesService } from './admin-release-notes.service';

const actor = { id: 'admin' } as User;

describe('AdminReleaseNotesController', () => {
  let service: jest.Mocked<Pick<AdminReleaseNotesService, 'update'>>;
  let controller: AdminReleaseNotesController;

  beforeEach(() => {
    service = { update: jest.fn() };
    controller = new AdminReleaseNotesController(
      service as unknown as AdminReleaseNotesService,
    );
  });

  it('checks only the fields sent: a title alone needs no display', async () => {
    // The DTO declares every field, those left out undefined.
    const dto = Object.assign(new UpdateReleaseNoteDto(), {
      title: 'Carte',
      display: undefined,
    });
    await controller.update(actor, '0.3.0', dto);
    expect(service.update).toHaveBeenCalledWith('0.3.0', dto, actor);
  });

  it('refuses a title too long', () => {
    const dto = Object.assign(new UpdateReleaseNoteDto(), {
      title: 'x'.repeat(81),
    });
    expect(() => controller.update(actor, '0.3.0', dto)).toThrow(
      BadRequestException,
    );
  });
});
