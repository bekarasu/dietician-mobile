import { NetworkHeaders, useNetworkLogStore } from './networkLogStore';

// Rendering very large strings in a Text freezes the inspector.
const MAX_BODY_LENGTH = 100_000;
const TEXT_CONTENT_TYPE = /json|text|xml|javascript|x-www-form-urlencoded/i;

// Fast Refresh re-runs this module, so the unwrapped fetch is kept on the
// wrapper itself. Reinstalling replaces the wrapper instead of stacking one
// more, which would log every request twice.
const ORIGINAL_FETCH = Symbol.for('networkInspector.originalFetch');

type WrappedFetch = typeof fetch & { [ORIGINAL_FETCH]?: typeof fetch };

// Wraps the global fetch, which here is expo/fetch (see expo-platform-gotchas),
// so every call in the app is recorded, including authService's plain fetches.
// Must run after Expo installs its fetch; App.tsx is evaluated after that.
export function installNetworkLogger() {
  const currentFetch: WrappedFetch = globalThis.fetch;
  const originalFetch = currentFetch[ORIGINAL_FETCH] ?? currentFetch;

  const loggedFetch: WrappedFetch = async (input, init) => {
    const request = input instanceof Request ? input : null;
    const url = request ? request.url : String(input);

    // bloodTestService reads picked files through file:// URLs. That is not
    // network traffic, and the body is a whole document.
    if (!/^https?:/i.test(url)) {
      return originalFetch(input, init);
    }

    const startedAt = Date.now();
    const { add, update } = useNetworkLogStore.getState();

    const id = add({
      method: (init?.method ?? request?.method ?? 'GET').toUpperCase(),
      url,
      startedAt,
      state: 'pending',
      requestHeaders: toHeaderList(init?.headers ?? request?.headers),
      requestBody: describeRequestBody(init?.body),
      responseHeaders: [],
    });

    let response: Response;
    try {
      response = await originalFetch(input, init);
    } catch (error) {
      update(id, { state: 'failed', durationMs: Date.now() - startedAt, error: errorMessage(error) });
      throw error;
    }

    update(id, {
      state: 'done',
      status: response.status,
      durationMs: Date.now() - startedAt,
      responseHeaders: toHeaderList(response.headers),
    });

    void readResponseBody(response).then((responseBody) => update(id, { responseBody }));

    return response;
  };

  loggedFetch[ORIGINAL_FETCH] = originalFetch;
  globalThis.fetch = loggedFetch;
}

// Reads a clone so the caller can still consume the original. The clone is
// taken before the first await, so it happens before this function returns
// and before the caller can touch the body.
async function readResponseBody(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType && !TEXT_CONTENT_TYPE.test(contentType)) {
    const length = response.headers.get('content-length');
    return `[${contentType}${length ? `, ${length} bytes` : ''}, not shown]`;
  }

  try {
    return truncate(await response.clone().text());
  } catch (error) {
    return `[Could not read body: ${errorMessage(error)}]`;
  }
}

function describeRequestBody(body: BodyInit | null | undefined): string | undefined {
  if (body == null) {
    return undefined;
  }
  if (typeof body === 'string') {
    return truncate(body);
  }
  if (body instanceof URLSearchParams) {
    return truncate(body.toString());
  }
  if (body instanceof FormData) {
    const parts: string[] = [];
    body.forEach((value, name) => {
      parts.push(`${name}: ${typeof value === 'string' ? value : describeBlob(value)}`);
    });
    return truncate(parts.join('\n'));
  }
  if (body instanceof Blob) {
    return describeBlob(body);
  }
  if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
    return `[Binary, ${body.byteLength} bytes]`;
  }
  return `[${Object.prototype.toString.call(body)}]`;
}

function describeBlob(blob: Blob) {
  // Expo's FormData patch stores the file name on the blob.
  const { name } = blob as Blob & { name?: string };
  return `[File${name ? ` ${name}` : ''}, ${blob.type || 'unknown type'}, ${blob.size} bytes]`;
}

function toHeaderList(headers: HeadersInit | undefined): NetworkHeaders {
  const list: NetworkHeaders = [];
  new Headers(headers).forEach((value, name) => {
    list.push([name, value]);
  });
  return list;
}

function truncate(text: string) {
  return text.length > MAX_BODY_LENGTH
    ? `${text.slice(0, MAX_BODY_LENGTH)}\n\n[Truncated, ${text.length} characters in total]`
    : text;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
