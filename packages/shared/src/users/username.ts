export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

/** Allowed characters only, for forms that report the length separately. */
export const USERNAME_CHARACTERS_PATTERN = /^[a-z0-9_]+$/;

/** Allowed characters and length: the full rule enforced by the API. */
export const USERNAME_PATTERN = new RegExp(
  `^[a-z0-9_]{${USERNAME_MIN_LENGTH},${USERNAME_MAX_LENGTH}}$`,
);
