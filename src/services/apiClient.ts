import { ApiError } from './apiError';
import { authService } from './authService';
import { withLanguageHeader } from './requestHeaders';
import { tokenService } from './tokenService';

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string | null) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

export const fetchWithAuth = async (url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> => {
  let token = await tokenService.getAccessToken();

  const buildOptions = (currentToken: string | null) => {
    const headers = withLanguageHeader(options.headers);
    if (currentToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }
    return { ...options, headers };
  };

  let response = await fetch(url, buildOptions(token));

  if (response.status === 401) {
    const refreshToken = await tokenService.getRefreshToken();
    
    if (refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;
        authService.refresh(refreshToken)
          .then(async (newTokens) => {
            await tokenService.setTokens(newTokens.accessToken, newTokens.refreshToken);
            isRefreshing = false;
            onRefreshed(newTokens.accessToken);
          })
          .catch(async () => {
            isRefreshing = false;
            await tokenService.clearTokens();
            onRefreshed(null);
          });
      }

      return new Promise<Response>((resolve) => {
        subscribeTokenRefresh(async (newToken: string | null) => {
          if (newToken) {
            resolve(await fetch(url, buildOptions(newToken)));
          } else {
            resolve(response);
          }
        });
      });
    } else {
      await tokenService.clearTokens();
    }
  }

  return response;
};

// Unwraps the `{ message, data }` envelope. Failures throw an ApiError with the
// server's message, which is translated and safe to show.
export const fetchData = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetchWithAuth(url, options);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw ApiError.fromBody(body, response.status);
  }

  return body?.data as T;
};
