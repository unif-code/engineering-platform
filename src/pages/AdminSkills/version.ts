function getPreviousVersion(version: string): string | undefined {
  const parsedVersion = Number.parseFloat(version.replace('v', ''));
  if (!Number.isFinite(parsedVersion) || parsedVersion <= 1) {
    return undefined;
  }
  return `v${(parsedVersion - 0.1).toFixed(1)}`;
}

export function getPreviousVersions(version: string): string[] {
  const previousVersion = getPreviousVersion(version);
  return previousVersion ? [previousVersion] : [];
}
