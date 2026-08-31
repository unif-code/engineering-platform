export interface WorkflowSubmissionIdentity {
  canonicalPayload: string;
  idempotencyKey: string;
}

export interface PreparedWorkflowSubmission<T> {
  identity: WorkflowSubmissionIdentity;
  input: T;
}

export interface SddWorkflowInput {
  artifactId?: string | null;
  content: string;
}

export interface CreatedSddArtifactReference {
  artifactId: string;
  artifactVersion: number;
  requirementRevision: number;
}

export interface SddWorkflowSubmission {
  artifactIdempotencyKey: string;
  baselineIdempotencyKey: string;
  canonicalPayload: string;
  createdArtifact?: CreatedSddArtifactReference;
  input: { artifactId: string | null; content: string };
}

function normalizeValue(value: unknown, trimStrings: boolean): unknown {
  if (typeof value === 'string') {
    return trimStrings ? value.trim() : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item, trimStrings));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizeValue(item, trimStrings)]),
    );
  }
  return value;
}

function canonicalize(value: unknown, trimStrings: boolean): string {
  return JSON.stringify(normalizeValue(value, trimStrings));
}

export function prepareWorkflowSubmission<T>(
  input: T,
  previous: WorkflowSubmissionIdentity | undefined,
  createKey: () => string = () => crypto.randomUUID(),
): PreparedWorkflowSubmission<T> {
  const normalizedInput = normalizeValue(input, true) as T;
  const canonicalPayload = canonicalize(normalizedInput, false);
  if (previous?.canonicalPayload === canonicalPayload) {
    return { identity: previous, input: normalizedInput };
  }
  return {
    identity: { canonicalPayload, idempotencyKey: createKey() },
    input: normalizedInput,
  };
}

export function prepareSddWorkflowSubmission(
  input: SddWorkflowInput,
  previous: SddWorkflowSubmission | undefined,
  createKey: () => string = () => crypto.randomUUID(),
): SddWorkflowSubmission {
  const normalizedInput = {
    artifactId: input.artifactId?.trim() || null,
    content: input.content,
  };
  const canonicalPayload = canonicalize(normalizedInput, false);
  if (previous?.canonicalPayload === canonicalPayload) {
    return previous;
  }
  return {
    artifactIdempotencyKey: createKey(),
    baselineIdempotencyKey: createKey(),
    canonicalPayload,
    input: normalizedInput,
  };
}

export function recordSddArtifactCreated(
  submission: SddWorkflowSubmission,
  createdArtifact: CreatedSddArtifactReference,
): SddWorkflowSubmission & {
  createdArtifact: CreatedSddArtifactReference;
} {
  return { ...submission, createdArtifact };
}
