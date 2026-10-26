import type { User } from '../../users/user.entity';
import type { UsersService } from '../../users/users.service';
import type { AuthService } from '../auth.service';
import { GoogleAuthService } from './google-auth.service';
import type { GoogleProfile } from './google-oauth.service';
import type { OAuthAccountsService } from './oauth-accounts.service';

const profile: GoogleProfile = {
  subject: 'google-sub',
  email: 'jean@gmail.com',
  emailVerified: true,
  name: 'Jean Dupont',
  picture: 'https://lh3.googleusercontent.com/a/photo',
};
const metadata = {};
const user = { id: 'user-id' } as User;
const authResult = { user, session: { token: 'token', expiresAt: new Date() } };

describe('GoogleAuthService', () => {
  let users: jest.Mocked<
    Pick<
      UsersService,
      | 'findById'
      | 'findByEmail'
      | 'setExternalAvatarIfMissing'
      | 'create'
      | 'delete'
    >
  >;
  let oauthAccounts: jest.Mocked<
    Pick<OAuthAccountsService, 'findUserId' | 'link'>
  >;
  let auth: jest.Mocked<Pick<AuthService, 'startSession'>>;
  let service: GoogleAuthService;

  beforeEach(() => {
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      setExternalAvatarIfMissing: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };
    oauthAccounts = { findUserId: jest.fn(), link: jest.fn() };
    auth = { startSession: jest.fn().mockResolvedValue(authResult) };
    service = new GoogleAuthService(
      users as unknown as UsersService,
      oauthAccounts as unknown as OAuthAccountsService,
      auth as unknown as AuthService,
    );
  });

  it('signs in a user whose Google account is already linked', async () => {
    oauthAccounts.findUserId.mockResolvedValue('user-id');
    users.findById.mockResolvedValue(user);

    await expect(service.signIn(profile, metadata)).resolves.toEqual({
      kind: 'signed-in',
      result: authResult,
    });
    expect(oauthAccounts.link).not.toHaveBeenCalled();
  });

  it('links Google to an existing account with the same email', async () => {
    oauthAccounts.findUserId.mockResolvedValue(null);
    users.findByEmail.mockResolvedValue(user);

    const outcome = await service.signIn(profile, metadata);

    expect(outcome.kind).toBe('signed-in');
    expect(oauthAccounts.link).toHaveBeenCalledWith(
      'user-id',
      'google',
      'google-sub',
    );
  });

  it('requires a sign-up step for a new Google identity', async () => {
    oauthAccounts.findUserId.mockResolvedValue(null);
    users.findByEmail.mockResolvedValue(null);

    await expect(service.signIn(profile, metadata)).resolves.toEqual({
      kind: 'signup-required',
      pending: {
        subject: 'google-sub',
        email: 'jean@gmail.com',
        name: 'Jean Dupont',
        picture: profile.picture,
      },
    });
  });

  it('never links an unverified Google email', async () => {
    oauthAccounts.findUserId.mockResolvedValue(null);

    await expect(
      service.signIn({ ...profile, emailVerified: false }, metadata),
    ).rejects.toBeDefined();
    expect(users.findByEmail).not.toHaveBeenCalled();
  });

  it('creates the account when the sign-up is completed', async () => {
    users.create.mockResolvedValue(user);

    await service.completeSignup(
      {
        subject: 'google-sub',
        email: 'jean@gmail.com',
        name: '  Jean Dupont  ',
        picture: null,
      },
      { username: 'jean', acceptTerms: true },
      metadata,
    );

    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'jean@gmail.com',
        username: 'jean',
        displayName: 'Jean Dupont',
        termsAcceptedAt: expect.any(Date) as Date,
      }),
    );
    expect(oauthAccounts.link).toHaveBeenCalledWith(
      'user-id',
      'google',
      'google-sub',
    );
    expect(auth.startSession).toHaveBeenCalledWith(user, metadata);
  });
});
