/**
 * pxshot-api: the official JavaScript/TypeScript client for the
 * pxshot screenshot API (https://pxshot.dev/docs).
 *
 * Zero dependencies. Works in Node 18+, browsers, and edge runtimes.
 */

export type CaptureFormat = 'png' | 'jpeg' | 'webp' | 'pdf';

export interface CaptureOptions {
  /** Output format. Default: png. Non-PNG formats need a Pro or Business plan. */
  format?: CaptureFormat;
  /** Viewport width in pixels, 320 to 3840 (plan-capped). Default: 1280. */
  width?: number;
  /** Viewport height in pixels, 200 to 2160 (plan-capped). Default: 720. */
  height?: number;
  /** Capture the whole scrollable page instead of just the viewport. Pro or Business. */
  fullPage?: boolean;
  /** Milliseconds to wait after load before capturing, up to 10000. Pro or Business. */
  delay?: number;
  /** JPEG/WebP quality, 1 to 100. Default: 80. Ignored for PNG and PDF. */
  quality?: number;
  /** Transparent background for PNG output. Pro or Business. */
  transparent?: boolean;
  /** Extra HTTP headers sent to the target page. Pro or Business. */
  headers?: Record<string, string>;
  /** Disable JavaScript on the target page. Business. */
  blockJs?: boolean;
  /** CSS selector to clip the screenshot to one element. Business. */
  selector?: string;
}

export interface CaptureResult {
  /** The raw image or PDF bytes. In Node, wrap with Buffer.from(result.data) to write to disk. */
  data: ArrayBuffer;
  /** image/png, image/jpeg, image/webp, or application/pdf */
  contentType: string;
  /** Unique id for this capture, visible in your dashboard history */
  screenshotId: string | null;
  /** How long the render took, in milliseconds */
  durationMs: number | null;
  /** Captures used this billing period, after this one */
  monthlyUsed: number | null;
  /** Your plan's monthly capture limit */
  monthlyLimit: number | null;
  /** Requests left in the current per-minute window */
  rateLimitRemaining: number | null;
}

export class PxshotError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'PxshotError';
  }
}

export interface PxshotClientOptions {
  /** Override the API base URL (defaults to https://pxshot.dev) */
  baseUrl?: string;
  /** Custom fetch implementation */
  fetch?: typeof fetch;
}

function toNum(value: string | null): number | null {
  return value === null ? null : Number(value);
}

export class Pxshot {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(apiKey: string, options: PxshotClientOptions = {}) {
    if (!apiKey) throw new Error('pxshot: an API key is required. Create one at https://pxshot.dev/dashboard');
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://pxshot.dev').replace(/\/$/, '');
    this.fetchImpl = options.fetch ?? fetch;
  }

  private buildUrl(url: string, options: CaptureOptions): string {
    const params = new URLSearchParams({ url });
    if (options.format) params.set('format', options.format);
    if (options.width !== undefined) params.set('width', String(options.width));
    if (options.height !== undefined) params.set('height', String(options.height));
    if (options.fullPage) params.set('full_page', 'true');
    if (options.delay !== undefined) params.set('delay', String(options.delay));
    if (options.quality !== undefined) params.set('quality', String(options.quality));
    if (options.transparent) params.set('transparent', 'true');
    if (options.headers) params.set('headers', JSON.stringify(options.headers));
    if (options.blockJs) params.set('block_js', 'true');
    if (options.selector) params.set('selector', options.selector);
    return `${this.baseUrl}/api/capture?${params.toString()}`;
  }

  /**
   * Capture a screenshot (or PDF) of a URL. The promise resolves once the
   * page has rendered, typically in one to a few seconds.
   */
  async capture(url: string, options: CaptureOptions = {}): Promise<CaptureResult> {
    const res = await this.captureResponse(url, options);
    return {
      data: await res.arrayBuffer(),
      contentType: res.headers.get('Content-Type') ?? 'application/octet-stream',
      screenshotId: res.headers.get('X-Screenshot-Id'),
      durationMs: toNum(res.headers.get('X-Duration-Ms')),
      monthlyUsed: toNum(res.headers.get('X-Monthly-Used')),
      monthlyLimit: toNum(res.headers.get('X-Monthly-Limit')),
      rateLimitRemaining: toNum(res.headers.get('X-RateLimit-Remaining')),
    };
  }

  /**
   * Like capture(), but returns the raw Response so you can stream the body
   * instead of buffering it. Throws PxshotError on any non-2xx status.
   */
  async captureResponse(url: string, options: CaptureOptions = {}): Promise<Response> {
    const res = await this.fetchImpl(this.buildUrl(url, options), {
      headers: { 'X-API-Key': this.apiKey },
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new PxshotError(data.error || `Request failed with status ${res.status}`, res.status);
    }
    return res;
  }
}

export default Pxshot;
