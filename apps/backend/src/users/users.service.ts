import { USERNAME_PATTERN } from '@kilotrace/shared';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import { isUniqueViolation } from '../common/database-errors';
import { EARLY_MEMBERS, UserTagAssignment } from './user-tag-assignment.entity';
import { randomProfileColor } from './profile-colors';
import { User } from './user.entity';
import { ReservedUsername } from './reserved-username.entity';
import { usernameBaseFromEmail, withNumericSuffix } from './username.util';

export interface CreateUserInput {
  email: string;
  username: string;
  displayName?: string | null;
  termsAcceptedAt?: Date | null;
  passwordHash?: string | null;
  externalAvatarUrl?: string | null;
}

export type UsernameAvailability =
  | { available: true }
  | { available: false; reason: 'invalid' | 'reserved' | 'taken' };

const MAX_SUFFIX_ATTEMPTS = 50;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(UserTagAssignment)
    private readonly userTags: Repository<UserTagAssignment>,
    @InjectRepository(ReservedUsername)
    private readonly reserved: Repository<ReservedUsername>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOneBy({ email: normalizeEmail(email) });
  }

  async checkUsername(
    username: string,
    exceptUserId?: string,
  ): Promise<UsernameAvailability> {
    if (!USERNAME_PATTERN.test(username)) {
      return { available: false, reason: 'invalid' };
    }
    // Checked first: a reserved username reads as such, even when held.
    if (await this.reserved.existsBy({ username })) {
      return { available: false, reason: 'reserved' };
    }
    const taken = await this.users.existsBy(
      exceptUserId ? { username, id: Not(exceptUserId) } : { username },
    );
    return taken ? { available: false, reason: 'taken' } : { available: true };
  }

  /** Suggests a free username derived from an email: `jean`, then `jean2`, `jean3`... */
  async suggestUsername(email: string): Promise<string> {
    const base = usernameBaseFromEmail(email);
    for (let attempt = 1; attempt <= MAX_SUFFIX_ATTEMPTS; attempt++) {
      const candidate = attempt === 1 ? base : withNumericSuffix(base, attempt);
      if ((await this.checkUsername(candidate)).available) {
        return candidate;
      }
    }
    return withNumericSuffix(base, Math.floor(1000 + Math.random() * 9000));
  }

  async create(input: CreateUserInput): Promise<User> {
    await this.assertUsernameAvailable(input.username);
    const user = this.users.create({
      email: normalizeEmail(input.email),
      username: input.username,
      displayName: input.displayName ?? null,
      termsAcceptedAt: input.termsAcceptedAt ?? null,
      passwordHash: input.passwordHash ?? null,
      externalAvatarUrl: input.externalAvatarUrl ?? null,
      avatarKey: null,
      profileColor: randomProfileColor(),
    });
    const saved = await this.save(user);
    if ((await this.users.count()) <= EARLY_MEMBERS) {
      await this.userTags.insert({
        userId: saved.id,
        kind: 'early_member',
      });
    }
    return saved;
  }

  async updateProfile(
    user: User,
    changes: Partial<
      Pick<
        User,
        | 'displayName'
        | 'username'
        | 'bio'
        | 'city'
        | 'countryCode'
        | 'favoriteSports'
        | 'profileColor'
      >
    >,
  ): Promise<User> {
    if (changes.username !== undefined && changes.username !== user.username) {
      await this.assertUsernameAvailable(changes.username, user.id);
      user.username = changes.username;
    }
    if (changes.displayName !== undefined) {
      user.displayName = changes.displayName;
    }
    if (changes.bio !== undefined) {
      user.bio = changes.bio;
    }
    if (changes.city !== undefined) {
      user.city = changes.city;
      // A country without its city means nothing.
      user.countryCode =
        changes.city === null ? null : (changes.countryCode ?? null);
    }
    if (changes.favoriteSports !== undefined) {
      user.favoriteSports = changes.favoriteSports;
    }
    if (changes.profileColor !== undefined) {
      user.profileColor = changes.profileColor?.toLowerCase() ?? null;
    }
    return this.save(user);
  }

  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.users.update({ id: userId }, { passwordHash });
  }

  async setAvatarKey(userId: string, avatarKey: string | null): Promise<void> {
    await this.users.update({ id: userId }, { avatarKey });
  }

  async setExternalAvatarIfMissing(
    user: User,
    url: string | null,
  ): Promise<void> {
    if (url && !user.externalAvatarUrl) {
      await this.users.update({ id: user.id }, { externalAvatarUrl: url });
    }
  }

  async delete(userId: string): Promise<void> {
    await this.users.delete({ id: userId });
  }

  private async assertUsernameAvailable(
    username: string,
    exceptUserId?: string,
  ): Promise<void> {
    const availability = await this.checkUsername(username, exceptUserId);
    if (availability.available) {
      return;
    }
    if (availability.reason === 'reserved') {
      throw ApiErrors.conflict(
        ApiErrorCode.UsernameReserved,
        'This username is reserved',
      );
    }
    throw ApiErrors.conflict(
      ApiErrorCode.UsernameTaken,
      'This username is already taken',
    );
  }

  /** Translates unique violations raised by concurrent writes into API errors. */
  private async save(user: User): Promise<User> {
    try {
      return await this.users.save(user);
    } catch (error) {
      if (isUniqueViolation(error, 'email')) {
        throw ApiErrors.conflict(
          ApiErrorCode.EmailTaken,
          'This email is already registered',
        );
      }
      if (isUniqueViolation(error, 'username')) {
        throw ApiErrors.conflict(
          ApiErrorCode.UsernameTaken,
          'This username is already taken',
        );
      }
      throw error;
    }
  }
}
