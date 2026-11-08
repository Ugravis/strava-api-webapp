import type { Repository } from 'typeorm';
import type { NotificationsService } from '../notifications/notifications.service';
import type { ReleaseNote } from './release-note.entity';
import type { ReleaseNoteView } from './release-note-view.entity';
import { isDelivered, ReleaseNotesService } from './release-notes.service';

const note = (fields: Partial<ReleaseNote>): ReleaseNote =>
  ({
    version: '0.3.0',
    releasedAt: new Date('2026-11-01'),
    status: 'ready',
    display: 'banner',
    title: 'Nouveautés',
    summary: null,
    sectionNew: null,
    sectionImproved: null,
    sectionFixed: null,
    sectionOther: null,
    notifiedAt: null,
    disabledAt: null,
    createdAt: new Date('2026-10-01'),
    ...fields,
  }) as ReleaseNote;

describe('ReleaseNotesService', () => {
  let notes: {
    createQueryBuilder: jest.Mock;
    findBy: jest.Mock;
    findOneBy: jest.Mock;
    update: jest.Mock;
    query: jest.Mock;
  };
  let notifications: jest.Mocked<
    Pick<NotificationsService, 'notifyRelease' | 'withdrawRelease'>
  >;
  let service: ReleaseNotesService;

  beforeEach(() => {
    // The chain of `createQueryBuilder().insert()…execute()`.
    const insert: Record<string, jest.Mock> = {};
    for (const step of ['insert', 'into', 'values', 'orIgnore']) {
      insert[step] = jest.fn(() => insert);
    }
    insert.execute = jest.fn();
    notes = {
      createQueryBuilder: jest.fn(() => insert),
      findBy: jest.fn().mockResolvedValue([]),
      findOneBy: jest.fn(),
      update: jest.fn(),
      query: jest.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]),
    };
    notifications = {
      notifyRelease: jest.fn(),
      withdrawRelease: jest.fn(),
    };
    service = new ReleaseNotesService(
      notes as unknown as Repository<ReleaseNote>,
      {} as Repository<ReleaseNoteView>,
      notifications as unknown as NotificationsService,
    );
  });

  it('delivers a ready note, out, shown and with something to say', () => {
    expect(isDelivered(note({}))).toBe(true);
    expect(isDelivered(note({ status: 'draft' }))).toBe(false);
    expect(isDelivered(note({ releasedAt: null }))).toBe(false);
    expect(isDelivered(note({ display: 'none' }))).toBe(false);
    expect(isDelivered(note({ title: null }))).toBe(false);
    expect(isDelivered(note({ disabledAt: new Date() }))).toBe(false);
  });

  it('releases the notes written for this version or a skipped one, not later ones', async () => {
    notes.findBy.mockResolvedValue([
      note({ version: '0.2.1', releasedAt: null }),
      note({ version: '0.3.0', releasedAt: null }),
      note({ version: '0.4.0', releasedAt: null }),
    ]);
    notes.findOneBy.mockResolvedValue(null);
    const now = new Date('2026-11-03');
    await service.recordRelease('0.3.0', now);
    expect(notes.update).toHaveBeenCalledWith('0.2.1', { releasedAt: now });
    expect(notes.update).toHaveBeenCalledWith('0.3.0', { releasedAt: now });
    expect(notes.update).not.toHaveBeenCalledWith('0.4.0', expect.anything());
  });

  it('notifies the concerned users once a note is delivered', async () => {
    notes.findOneBy.mockResolvedValue(note({}));
    await service.sync('0.3.0');
    expect(notes.update).toHaveBeenCalledWith('0.3.0', {
      notifiedAt: expect.any(Date) as Date,
    });
    expect(notifications.notifyRelease).toHaveBeenCalledWith(
      ['a', 'b'],
      '0.3.0',
    );
  });

  it('never notifies twice', async () => {
    notes.findOneBy.mockResolvedValue(note({ notifiedAt: new Date() }));
    await service.sync('0.3.0');
    expect(notifications.notifyRelease).not.toHaveBeenCalled();
    expect(notifications.withdrawRelease).not.toHaveBeenCalled();
  });

  it('withdraws the notifications of a disabled note, never to send them again', async () => {
    notes.findOneBy.mockResolvedValue(
      note({ disabledAt: new Date(), notifiedAt: new Date() }),
    );
    await service.sync('0.3.0');
    expect(notifications.withdrawRelease).toHaveBeenCalledWith('0.3.0');
    // Still marked notified: enabled again, it notifies nobody.
    expect(notes.update).not.toHaveBeenCalled();
  });
});
