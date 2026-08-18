const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function randomNumber(maxExclusive: number): number {
  const values = crypto.getRandomValues(new Uint32Array(1));
  return (values[0] ?? 0) % maxExclusive;
}

export function createEmployeeNo(): string {
  return String(10_000_000 + randomNumber(90_000_000));
}

export function createPassword(): string {
  return `Aa!${crypto.randomUUID()}`;
}

export function createTotpCode(): string {
  return String(100_000 + randomNumber(900_000));
}

export function createTotpSecret(): string {
  const values = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(
    values,
    (value) => base32Alphabet.at(value % base32Alphabet.length) ?? 'A',
  ).join('');
}

export function createChallengeToken(): string {
  return `challenge-${crypto.randomUUID()}`;
}

export function createProvisioningUri(
  employeeNo: string,
  secret: string,
): string {
  return `otpauth://totp/EP:${employeeNo}?secret=${secret}&issuer=EP`;
}
