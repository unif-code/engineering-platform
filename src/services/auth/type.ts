export interface CurrentUser {
  employeeId: string;
  name: string;
}

export interface LoginInput {
  employeeId: string;
  password: string;
  totp: string;
}
