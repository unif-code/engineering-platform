const parseSemver = (version) => {
  const match = String(version ?? '').match(
    /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/,
  );
  if (match === null) return null;
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
  };
};

export function classifyBreakingRelease(baseVersion, currentVersion) {
  const base = parseSemver(baseVersion);
  const current = parseSemver(currentVersion);
  if (base === null || current === null) return null;
  if (current.major > base.major) return 'major';
  if (base.major === 0 && current.major === 0 && current.minor > base.minor) {
    return 'development-minor';
  }
  return null;
}
