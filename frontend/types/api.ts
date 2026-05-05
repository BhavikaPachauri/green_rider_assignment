export type Role = "ADMIN" | "MEMBER";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  role?: Role;
};

export type LoginPayload = {
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

export type PublicUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

export type AuthTokensResponse = {
  accessToken: string;
  refreshToken: string;
  user?: PublicUser;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
};

export type ProjectMember = {
  id: number;
  projectId: number;
  userId: number;
  joinedAt: string;
  user: PublicUser;
};

export type Project = {
  id: number;
  name: string;
  description: string | null;
  ownerId: number;
  owner: PublicUser;
  members: ProjectMember[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
    members: number;
  };
};

export type ProjectListResponse = {
  data: Project[];
};

export type Task = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string | null;
  projectId: number;
  assigneeId: number | null;
  creatorId: number;
  createdAt: string;
  updatedAt: string;
  project?: { id: number; name: string; ownerId: number };
  assignee?: { id: number; name: string; email: string } | null;
  creator?: { id: number; name: string; email: string };
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

export type DashboardSummary = {
  totals: {
    projects: number;
    tasks: number;
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
    myAssignedOpen: number;
    teamMembers: number;
  };
  upcomingTasks: Task[];
};

export type UserListResponse = {
  data: PublicUser[];
};

export type ApiRequestInit = RequestInit & {
  accessToken?: string;
};
