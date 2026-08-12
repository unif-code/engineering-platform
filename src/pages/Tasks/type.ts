export type TaskStage =
  | 'Clarification'
  | 'Spec'
  | 'Plan'
  | 'Implementation'
  | 'Review';

export type TaskStatus = 'pending' | 'running' | 'blocked' | 'completed';
export type TaskListMode = 'active' | 'archived';
export type TaskView = 'table' | 'board';

export interface TaskRow {
  id: string;
  title: string;
  team: string;
  workspace: string;
  repository: string;
  stage: TaskStage;
  status: TaskStatus;
  owner: string;
  agent: string;
  updatedAt: string;
}

export interface TaskQueryParams {
  current?: number;
  pageSize?: number;
  keyword?: string;
  status?: TaskStatus | 'all';
  mode?: TaskListMode;
}

export interface CreateTaskInput {
  title: string;
  workspace: string;
  repository: string;
  description: string;
}

export interface AssignTaskInput {
  employeeId: string;
  repository: string;
}
