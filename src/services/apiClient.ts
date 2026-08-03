import { authService } from './authService';
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
    const headers = new Headers(options.headers || {});
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
