const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

// A request the server answered with an error. The backend sends
// `{ error, code, requestId }`, and `error` is already translated for the user,
// so `message` can go straight into a dialog.
export class ApiError extends Error {
  readonly status: number;
  readonly requestId?: string;

  constructor(message: string, status: number, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
  }

  // Reads the error body. `fallbackMessage` is used only when the server sent no
  // message, such as a proxy's HTML error page.
  static async fromResponse(response: Response, fallbackMessage = DEFAULT_ERROR_MESSAGE): Promise<ApiError> {
    const body = await response.json().catch(() => null);
    return ApiError.fromBody(body, response.status, fallbackMessage);
  }

  // For callers that already read the body.
  static fromBody(body: unknown, status: number, fallbackMessage = DEFAULT_ERROR_MESSAGE): ApiError {
    const { error, requestId } = (body ?? {}) as { error?: unknown; requestId?: unknown };
    const message = typeof error === 'string' && error.trim() ? error : fallbackMessage;
    return new ApiError(message, status, typeof requestId === 'string' ? requestId : undefined);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

// The text to show for a failed request: the server's message, or `fallback` when
// the request never got an answer (offline, timeout), whose message isn't meant for users.
export function getErrorMessage(error: unknown, fallback = DEFAULT_ERROR_MESSAGE): string {
  return isApiError(error) ? error.message : fallback;
}
