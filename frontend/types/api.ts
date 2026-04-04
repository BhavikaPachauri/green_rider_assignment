export type RegisterPayload = {
  email: string;
  password: string;
};

export type RefreshPayload = {
  refreshToken: string;
};

export type ApiResponse = {
  message?: string;
  id?: number;
  email?: string;
  createdAt?: string;
};

export type ApiErrorPayload = {
  message?: string;
};

export type AuthTokensResponse = {
  accessToken: string;
  refreshToken: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  email: string;
};

export type Task = {
  id: number;
  title: string;
  completed: boolean;
  userId: number;
  createdAt: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type TaskListResponse = {
  data: Task[];
  pagination: Pagination;
};

export type ApiRequestInit = RequestInit & {
  accessToken?: string;
};
