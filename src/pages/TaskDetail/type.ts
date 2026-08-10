export type InspectorTabKey =
  | 'overview'
  | 'documents'
  | 'code'
  | 'execution'
  | 'preview';

export interface ArtifactRecord {
  name: string;
  kind: string;
  path: string;
  version: string;
  author: string;
  updatedAt: string;
}

export interface TaskDetailFixture {
  id: string;
  title: string;
  status: string;
  stage: string;
  owner: string;
  workspace: string;
  repository: string;
  branch: string;
}

export type DiffLineKind = 'addition' | 'removal' | 'context';

export interface DiffLine {
  key: string;
  kind: DiffLineKind;
  content: string;
}

export interface DiffFile {
  path: string;
  summary: string;
  lines: readonly DiffLine[];
}

export interface RejectApprovalValues {
  reason: string;
}
