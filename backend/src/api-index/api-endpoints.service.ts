import { Injectable, RequestMethod, type Type } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { DEFAULT_THROTTLE } from '../auth/throttle';
import { API_PREFIX } from '../common/api-prefix';

export interface ApiEndpoint {
  method: string;
  path: string;
  access: 'public' | 'session';
  /** e.g. `10 / 60 s`, or null when the route is not throttled. */
  rateLimit: string | null;
  status: number;
  handler: string;
}

// Metadata keys written by @nestjs/throttler for the `default` throttler.
const THROTTLER_LIMIT = `THROTTLER:LIMIT${DEFAULT_THROTTLE.name}`;
const THROTTLER_TTL = `THROTTLER:TTL${DEFAULT_THROTTLE.name}`;
const THROTTLER_SKIP = `THROTTLER:SKIP${DEFAULT_THROTTLE.name}`;

const METHOD_ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

type Handler = (...args: unknown[]) => unknown;

function asList(path: unknown): string[] {
  if (Array.isArray(path)) {
    return path.filter((item): item is string => typeof item === 'string');
  }
  return typeof path === 'string' ? [path] : [''];
}

function joinPath(...segments: string[]): string {
  const path = segments
    .flatMap((segment) => segment.split('/'))
    .filter(Boolean)
    .join('/');
  return `/${path}`;
}

/**
 * Lists the HTTP endpoints from the route metadata of the registered
 * controllers, so that the listing follows the code without maintenance.
 */
@Injectable()
export class ApiEndpointsService {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  list(): ApiEndpoint[] {
    const endpoints: ApiEndpoint[] = [];
    for (const wrapper of this.discovery.getControllers()) {
      const instance: unknown = wrapper.instance;
      const metatype = wrapper.metatype as Type | null;
      if (!instance || !metatype) {
        continue;
      }
      const prototype = Object.getPrototypeOf(instance) as Record<
        string,
        Handler
      >;
      const controllerPaths = asList(
        Reflect.getMetadata(PATH_METADATA, metatype),
      );

      for (const name of this.scanner.getAllMethodNames(prototype)) {
        const handler = prototype[name];
        const routePath: unknown = Reflect.getMetadata(PATH_METADATA, handler);
        if (routePath === undefined) {
          continue;
        }
        const method =
          RequestMethod[
            Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod
          ];
        for (const controllerPath of controllerPaths) {
          for (const path of asList(routePath)) {
            endpoints.push({
              method,
              path: joinPath(API_PREFIX, controllerPath, path),
              access: this.isPublic(handler, metatype) ? 'public' : 'session',
              rateLimit: this.rateLimit(handler, metatype),
              status: this.status(handler, method),
              handler: `${metatype.name}.${name}`,
            });
          }
        }
      }
    }
    return endpoints.sort(
      (a, b) =>
        a.path.localeCompare(b.path) ||
        METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method),
    );
  }

  private isPublic(handler: Handler, controller: Type): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        handler,
        controller,
      ]) === true
    );
  }

  private rateLimit(handler: Handler, controller: Type): string | null {
    const targets = [handler, controller];
    if (this.reflector.getAllAndOverride<boolean>(THROTTLER_SKIP, targets)) {
      return null;
    }
    const limit =
      this.reflector.getAllAndOverride<number | undefined>(
        THROTTLER_LIMIT,
        targets,
      ) ?? DEFAULT_THROTTLE.limit;
    const ttl =
      this.reflector.getAllAndOverride<number | undefined>(
        THROTTLER_TTL,
        targets,
      ) ?? DEFAULT_THROTTLE.ttl;
    return `${limit} / ${ttl / 1000} s`;
  }

  /** Nest's default: 201 for POST, 200 otherwise, unless `@HttpCode` is set. */
  private status(handler: Handler, method: string): number {
    const status = Reflect.getMetadata(HTTP_CODE_METADATA, handler) as
      number | undefined;
    return status ?? (method === 'POST' ? 201 : 200);
  }
}
