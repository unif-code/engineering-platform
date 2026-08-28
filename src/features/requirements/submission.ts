import type { CreateRequirementInput } from './type';

export interface RequirementSubmissionIdentity {
  canonicalPayload: string;
  idempotencyKey: string;
}

export interface PreparedRequirementSubmission {
  identity: RequirementSubmissionIdentity;
  input: CreateRequirementInput;
}

export function canonicalizeRequirementInput(
  input: CreateRequirementInput,
): CreateRequirementInput {
  return {
    acceptanceCriteria: input.acceptanceCriteria.map((criterion) =>
      criterion.trim(),
    ),
    description: input.description.trim(),
    initialRepositoryId: input.initialRepositoryId,
    title: input.title.trim(),
    type: input.type,
    workspaceId: input.workspaceId,
  };
}

export function prepareRequirementSubmission(
  input: CreateRequirementInput,
  previous: RequirementSubmissionIdentity | undefined,
  createKey: () => string = () => crypto.randomUUID(),
): PreparedRequirementSubmission {
  const canonicalInput = canonicalizeRequirementInput(input);
  const canonicalPayload = JSON.stringify(canonicalInput);
  if (previous?.canonicalPayload === canonicalPayload) {
    return { identity: previous, input: canonicalInput };
  }
  return {
    identity: {
      canonicalPayload,
      idempotencyKey: createKey(),
    },
    input: canonicalInput,
  };
}
