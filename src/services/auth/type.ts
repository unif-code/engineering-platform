export interface Principal {
  employeeId: string;
  name: string;
}

export interface CurrentUser extends Principal {
  capabilities: string[];
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

export interface BootstrapTokenInput {
  bootstrapToken: string;
}

export interface BootstrapPasswordInput extends BootstrapTokenInput {
  password: string;
}

export interface BootstrapTotpConfirmInput extends BootstrapTokenInput {
  code: string;
}

export interface BootstrapResult {
  ok: true;
}

export interface BootstrapTotpEnrollment {
  provisioningUri: string;
}
