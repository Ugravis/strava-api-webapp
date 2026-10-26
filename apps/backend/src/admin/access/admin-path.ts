import { API_PREFIX } from '../../common/api-prefix';

const ADMIN_PATH = `/${API_PREFIX}/admin`;

/** Case and repeated slashes are ignored, as the router does. */
export function isAdminPath(path: string): boolean {
  const normalized = path.toLowerCase().replace(/\/{2,}/g, '/');
  return normalized === ADMIN_PATH || normalized.startsWith(`${ADMIN_PATH}/`);
}
