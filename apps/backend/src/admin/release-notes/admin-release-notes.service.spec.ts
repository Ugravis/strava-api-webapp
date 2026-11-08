import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { ReleaseNote } from '../../release-notes/release-note.entity';
import type { ReleaseNoteBannersService } from '../../release-notes/release-note-banners.service';
import type { ReleaseNotesService } from '../../release-notes/release-notes.service';
import type { User } from '../../users/user.entity';
import { AdminReleaseNotesService } from './admin-release-notes.service';

const actor = { id: 'admin' } as User;

const note = (fields: Partial<ReleaseNote>): ReleaseNote =>
  ({
    version: '0.3.0',
    releasedAt: null,
    status: 'draft',
    display: 'banner',
    title: null,
    summary: null,
    sectionNew: null,
    sectionImproved: null,
    sectionFixed: null,
    sectionOther: null,
    disabledAt: null,
    bannerKey: null,
    ...fields,
  }) as ReleaseNote;

describe('AdminReleaseNotesService', () => {
  let notes: {
    existsBy: jest.Mock;
    findOneBy: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    merge: jest.Mock;
  };
  let releaseNotes: { currentVersion: string; sync: jest.Mock };
  let banners: { deleteQuietly: jest.Mock; store: jest.Mock };
  let service: AdminReleaseNotesService;

  beforeEach(() => {
    notes = {
      existsBy: jest.fn().mockResolvedValue(false),
      findOneBy: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      merge: jest.fn((target: ReleaseNote, patch: Partial<ReleaseNote>) => ({
        ...target,
        ...patch,
      })),
    };
    releaseNotes = { currentVersion: '0.2.0', sync: jest.fn() };
    banners = { deleteQuietly: jest.fn(), store: jest.fn() };
    service = new AdminReleaseNotesService(
      notes as unknown as Repository<ReleaseNote>,
      {} as Repository<User>,
      releaseNotes as unknown as ReleaseNotesService,
      banners as unknown as ReleaseNoteBannersService,
    );
  });

  it('writes a note ahead as a draft, displayed after its impact', async () => {
    await service.create({ version: '1.0.0', title: 'La 1.0' }, actor);
    expect(notes.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        version: '1.0.0',
        status: 'draft',
        display: 'popup',
        title: 'La 1.0',
        updatedById: 'admin',
      }),
    );
  });

  it('keeps the display picked by the team', async () => {
    await service.create({ version: '0.3.0', display: 'none' }, actor);
    expect(notes.insert).toHaveBeenCalledWith(
      expect.objectContaining({ display: 'none' }),
    );
  });

  it('refuses a version already listed', async () => {
    notes.existsBy.mockResolvedValue(true);
    await expect(
      service.create({ version: '0.3.0' }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses a version already out, or passed', async () => {
    await expect(
      service.create({ version: '0.1.5' }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(notes.insert).not.toHaveBeenCalled();
  });

  it('refuses to make an empty note ready', async () => {
    notes.findOneBy.mockResolvedValue(note({}));
    await expect(
      service.setStatus('0.3.0', 'ready', actor),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(releaseNotes.sync).not.toHaveBeenCalled();
  });

  it('makes a note ready, then brings its notifications in line', async () => {
    notes.findOneBy.mockResolvedValue(note({ sectionNew: '- Carte' }));
    await service.setStatus('0.3.0', 'ready', actor);
    expect(notes.update).toHaveBeenCalledWith('0.3.0', {
      status: 'ready',
      updatedById: 'admin',
    });
    expect(releaseNotes.sync).toHaveBeenCalledWith('0.3.0');
  });

  it('refuses to empty a ready note', async () => {
    notes.findOneBy.mockResolvedValue(note({ status: 'ready', title: 'T' }));
    await expect(
      service.update('0.3.0', { title: null }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('changes only the fields sent', async () => {
    notes.findOneBy.mockResolvedValue(note({ title: 'T' }));
    await service.update('0.3.0', { fixed: '- Bug' }, actor);
    expect(notes.update).toHaveBeenCalledWith('0.3.0', {
      sectionFixed: '- Bug',
      updatedById: 'admin',
    });
  });

  it('deletes a note written ahead only', async () => {
    notes.findOneBy.mockResolvedValue(note({}));
    await service.delete('0.3.0');
    expect(notes.delete).toHaveBeenCalledWith('0.3.0');

    notes.findOneBy.mockResolvedValue(note({ releasedAt: new Date() }));
    await expect(service.delete('0.3.0')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('refuses an unknown version', async () => {
    notes.findOneBy.mockResolvedValue(null);
    await expect(service.delete('9.9.9')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('takes a draft back before the release', async () => {
    notes.findOneBy.mockResolvedValue(note({ status: 'ready', title: 'T' }));
    await service.setStatus('0.3.0', 'draft', actor);
    expect(notes.update).toHaveBeenCalledWith('0.3.0', {
      status: 'draft',
      updatedById: 'admin',
    });
  });

  it('never takes a published note back to a draft', async () => {
    notes.findOneBy.mockResolvedValue(
      note({ status: 'ready', title: 'T', releasedAt: new Date() }),
    );
    await expect(
      service.setStatus('0.3.0', 'draft', actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('disables a published note, and enables it again', async () => {
    notes.findOneBy.mockResolvedValue(
      note({ status: 'ready', title: 'T', releasedAt: new Date() }),
    );
    await service.setActive('0.3.0', false, actor);
    expect(notes.update).toHaveBeenCalledWith('0.3.0', {
      disabledAt: expect.any(Date) as Date,
      updatedById: 'admin',
    });
    await service.setActive('0.3.0', true, actor);
    expect(notes.update).toHaveBeenLastCalledWith('0.3.0', {
      disabledAt: null,
      updatedById: 'admin',
    });
    expect(releaseNotes.sync).toHaveBeenCalledTimes(2);
  });

  it('disables only a published note', async () => {
    notes.findOneBy.mockResolvedValue(note({ title: 'T' }));
    await expect(
      service.setActive('0.3.0', false, actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('renames a draft not out yet, its order following', async () => {
    notes.findOneBy.mockResolvedValue(note({}));
    await service.update('0.3.0', { version: '1.0.0-beta.1' }, actor);
    expect(notes.update).toHaveBeenCalledWith(
      '0.3.0',
      expect.objectContaining({
        version: '1.0.0-beta.1',
        versionOrder: expect.stringContaining('-') as string,
      }),
    );
    expect(releaseNotes.sync).toHaveBeenCalledWith('1.0.0-beta.1');
  });

  it('never renames a release nor a ready note', async () => {
    notes.findOneBy.mockResolvedValue(note({ releasedAt: new Date() }));
    await expect(
      service.update('0.3.0', { version: '0.4.0' }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
    notes.findOneBy.mockResolvedValue(note({ status: 'ready', title: 'T' }));
    await expect(
      service.update('0.3.0', { version: '0.4.0' }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('replaces a banner, the previous file deleted', async () => {
    notes.findOneBy.mockResolvedValue(note({ bannerKey: 'old' }));
    banners.store.mockResolvedValue('new');
    await service.setBanner('0.3.0', Buffer.from(''), actor);
    expect(notes.update).toHaveBeenCalledWith('0.3.0', {
      bannerKey: 'new',
      updatedById: 'admin',
    });
    expect(banners.deleteQuietly).toHaveBeenCalledWith('old');
  });
});
