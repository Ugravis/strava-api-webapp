/**
 * Public instance of the Overpass API, the query service of OpenStreetMap:
 * no account nor key. Its usage policy asks for fewer than 10,000 requests
 * and 1 GB a day, and for one request at a time.
 */
const DEFAULT_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'strava-api-webapp (train stations of the map)';
/** Between two requests, even successful ones. */
const MIN_INTERVAL_MS = 5_000;
/** Answers of a server at capacity: the request is sent again later. */
const RETRIABLE_STATUSES = new Set([429, 502, 503, 504]);
/** First wait after a refused request, doubled each time. */
const RETRY_BASE_MS = 30_000;
const MAX_ATTEMPTS = 5;

export class OverpassError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = 'OverpassError';
  }
}

/**
 * Sends Overpass queries one at a time, spaced, retrying those refused for
 * load (429 Too Many Requests, 502 to 504 for a server at capacity) with a
 * growing wait.
 */
export class OverpassClient {
  private last = 0;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly url: string = process.env.OVERPASS_URL || DEFAULT_URL,
    private readonly timeoutMs = 15 * 60_000,
  ) {}

  /** Body of the response to a query, as text. */
  query(query: string): Promise<string> {
    const next = this.queue.then(() => this.send(query));
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async send(query: string): Promise<string> {
    for (let attempt = 1; ; attempt++) {
      await sleep(this.last + MIN_INTERVAL_MS - Date.now());
      this.last = Date.now();
      let response: Response;
      try {
        response = await fetch(this.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': USER_AGENT,
          },
          body: new URLSearchParams({ data: query }).toString(),
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (error) {
        if (attempt >= MAX_ATTEMPTS) {
          throw new OverpassError(
            `Overpass unreachable: ${String(error)}`,
            null,
          );
        }
        await sleep(RETRY_BASE_MS * 2 ** (attempt - 1));
        continue;
      }
      const body = await response.text();
      this.last = Date.now();
      if (response.ok) {
        return body;
      }
      if (!RETRIABLE_STATUSES.has(response.status) || attempt >= MAX_ATTEMPTS) {
        throw new OverpassError(
          `Overpass answered ${response.status}: ${body.slice(0, 200)}`,
          response.status,
        );
      }
      await sleep(RETRY_BASE_MS * 2 ** (attempt - 1));
    }
  }
}

function sleep(ms: number): Promise<void> {
  return ms > 0
    ? new Promise((resolve) => setTimeout(resolve, ms))
    : Promise.resolve();
}
