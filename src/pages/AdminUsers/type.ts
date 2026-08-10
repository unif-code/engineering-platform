export interface UserRow {
  employeeId: string;
  name: string;
  email: string;
  roles: readonly string[];
  status: 'active' | 'disabled';
  lastActiveAt: string;
}

export type UserStatus = UserRow['status'];

export interface UserQueryParams {
  current?: number;
  pageSize?: number;
  keyword?: string;
  status?: UserStatus | 'all';
  role?: string | 'all';
}

export interface UserFormValues {
  employeeId: string;
  name: string;
  email: string;
  roles: string[];
  status: UserStatus;
}
