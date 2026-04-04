import type {
  ApiErrorPayload,
  ApiRequestInit,
  ApiResponse,
  AuthTokensResponse,
  RefreshPayload,
  RegisterPayload,
  Task,
  TaskListResponse,
} from "@/types/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:5000";

function buildUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

async function readResponse<T>(response: Response) {
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T | ApiErrorPayload) : null;

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : "Something went wrong while talking to the API.";

    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return payload as T;
}

export async function apiRequest<T>(
  path: string,
  { accessToken, headers, ...init }: ApiRequestInit = {},
) {
  const requestHeaders = new Headers(headers);

  if (init.body && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers: requestHeaders,
  });

  return readResponse<T>(response);
}

export function postLogin(payload: RegisterPayload) {
  return apiRequest<AuthTokensResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function postRegister(payload: RegisterPayload) {
  return apiRequest<ApiResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function postRefresh(payload: RefreshPayload) {
  return apiRequest<AuthTokensResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function postLogout(payload: RefreshPayload) {
  return apiRequest<ApiResponse>("/auth/logout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getTasks(query: string, accessToken: string) {
  return apiRequest<TaskListResponse>(`/tasks${query}`, { accessToken });
}

export function getTask(taskId: number, accessToken: string) {
  return apiRequest<Task>(`/tasks/${taskId}`, { accessToken });
}
