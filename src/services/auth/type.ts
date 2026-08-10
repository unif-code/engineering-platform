export interface CurrentUser {
  employeeId: string;
  name: string;
}

export interface LoginInput {
  employeeNo: string;
  password: string;
}

export type LoginResult =
  | {
      bootstrapToken: string;
      stage: 'BOOTSTRAP';
    }
  | {
      challengeToken: string;
      stage: 'TOTP';
    };

export interface TotpInput {
  challengeToken: string;
  code: string;
}

export interface TotpResult {
  ok: true;
}
