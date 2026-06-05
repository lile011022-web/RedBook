const API_BASE_URL_KEY = "redbook.apiBaseUrl";
const TOKEN_KEY = "redbook.token";
const DEFAULT_API_BASE_URL = "http://127.0.0.1:8010";
const OLD_DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

export function getApiBaseUrl() {
  const storedValue = localStorage.getItem(API_BASE_URL_KEY);
  if (!storedValue || storedValue === OLD_DEFAULT_API_BASE_URL) {
    localStorage.setItem(API_BASE_URL_KEY, DEFAULT_API_BASE_URL);
    return DEFAULT_API_BASE_URL;
  }
  return storedValue;
}

export function setApiBaseUrl(value: string) {
  localStorage.setItem(API_BASE_URL_KEY, value);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(value: string) {
  localStorage.setItem(TOKEN_KEY, value);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function readError(response: Response) {
  const text = await response.text();
  if (!text) {
    return `${response.status} ${response.statusText}`;
  }

  try {
    const payload = JSON.parse(text) as { detail?: unknown };
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
    return JSON.stringify(payload.detail || payload);
  } catch {
    return text;
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json() as Promise<T>;
}
