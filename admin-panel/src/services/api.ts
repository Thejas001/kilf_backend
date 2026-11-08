import axios, { AxiosError } from 'axios';
import { tokenStorage } from './tokenStorage';

export const PROD_API_URL = 'https://api.kilf.in';
export const DEV_API_URL = 'https://dev.api.kilf.in';

// VITE_API_URL (set at build time, e.g. in Vercel) always wins; an empty value
// (embedded build) stays same-origin. Otherwise pick by where the panel is served:
// admin.dev.kilf.in -> dev API, anything else -> production API.
function resolveApiUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv !== undefined) return fromEnv;
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  return host === 'dev.kilf.in' || host.endsWith('.dev.kilf.in') ? DEV_API_URL : PROD_API_URL;
}

export const API_URL: string = resolveApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await axios.post(`${API_URL}/api/admin/auth/refresh`, {
      refreshToken,
    });
    const { token, refreshToken: newRefreshToken } = res.data.data;
    tokenStorage.setTokens(token, newRefreshToken);
    return token;
  } catch {
    tokenStorage.clear();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      tokenStorage.clear();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? fallback;
  }
  return fallback;
}
