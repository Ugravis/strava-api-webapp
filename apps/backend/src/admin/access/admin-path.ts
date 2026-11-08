import { API_PREFIX } from '../../common/api-prefix';

const ADMIN_PATH = `/${API_PREFIX}/admin`;
const SIGN_IN_PATH = `${ADMIN_PATH}/auth`;

/** Case and repeated slashes are ignored, as the router does. */
function normalize(path: string): string {
  return path.toLowerCase().replace(/\/{2,}/g, '/');
}

const isUnder = (path: string, prefix: string): boolean => {
  const normalized = normalize(path);
  return normalized === prefix || normalized.startsWith(`${prefix}/`);
};

export function isAdminPath(path: string): boolean {
  return isUnder(path, ADMIN_PATH);
}

/** Sign-in of the back office: behind the secret of the admin app, before any session. */
export function isAdminSignInPath(path: string): boolean {
  return isUnder(path, SIGN_IN_PATH);
}
