# pxshot-api

The official JavaScript/TypeScript client for [pxshot](https://pxshot.dev), the screenshot API. Send a URL, get back a PNG, JPEG, WebP, or PDF rendered in real Chrome.

Zero dependencies. Works in Node 18+, browsers, and edge runtimes.

## Install

```bash
npm install pxshot-api
```

## Quick start

```ts
import Pxshot from 'pxshot-api';
import { writeFile } from 'node:fs/promises';

const pxshot = new Pxshot('px_your_key');

const shot = await pxshot.capture('https://example.com');
await writeFile('example.png', Buffer.from(shot.data));

console.log(`${shot.durationMs}ms, ${shot.monthlyUsed} of ${shot.monthlyLimit} used this month`);
```

Get an API key at [pxshot.dev/dashboard](https://pxshot.dev/dashboard). The free plan is 50 screenshots a month, no card required.

## Options

```ts
const pdf = await pxshot.capture('https://example.com/invoice/42', {
  format: 'pdf',
  fullPage: true,
  delay: 1000,
});
```

| Option | Type | Default | Notes |
|---|---|---|---|
| `format` | `'png' \| 'jpeg' \| 'webp' \| 'pdf'` | `png` | Non-PNG needs Pro or Business |
| `width` | number | 1280 | 320 to 3840, capped by plan |
| `height` | number | 720 | 200 to 2160, capped by plan |
| `fullPage` | boolean | false | Whole scrollable page. Pro or Business |
| `delay` | number | 0 | Extra ms to wait after load, up to 10000. Pro or Business |
| `quality` | number | 80 | JPEG/WebP only, 1 to 100 |
| `transparent` | boolean | false | Transparent PNG background. Pro or Business |
| `headers` | object | - | Extra HTTP headers for the target page. Pro or Business |
| `blockJs` | boolean | false | Disable JavaScript on the page. Business |
| `selector` | string | - | Clip to one element by CSS selector. Business |

Cookie consent banners are stripped automatically on every plan.

## Streaming

`captureResponse()` returns the raw `Response` so you can pipe the body instead of buffering it:

```ts
const res = await pxshot.captureResponse('https://example.com', { format: 'jpeg' });
// res.body is a ReadableStream
```

## Errors

Every non-2xx response throws a `PxshotError` with the API's message and the HTTP status:

```ts
import Pxshot, { PxshotError } from 'pxshot-api';

try {
  await pxshot.capture('https://example.com', { format: 'pdf' });
} catch (err) {
  if (err instanceof PxshotError) {
    console.error(err.status, err.message);
    // 403 "PDF export requires a Pro or Business plan."
    // 429 "Rate limit exceeded. Try again in a moment."
  }
}
```

## In the browser

API keys can be locked to your own origins in the dashboard, which makes them safe to use from frontend code directly:

```ts
const pxshot = new Pxshot('px_origin_locked_key');
const shot = await pxshot.capture('https://example.com');
const url = URL.createObjectURL(new Blob([shot.data], { type: shot.contentType }));
```

Requests from any other origin are rejected, so the key is useless if someone lifts it from your source.

## Docs

Full API reference: [pxshot.dev/docs](https://pxshot.dev/docs)

## License

MIT
