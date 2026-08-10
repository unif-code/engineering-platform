export interface WorkspaceFixture {
  id: string;
  name: string;
  description: string;
  members: readonly { employeeId: string; name: string; role: string }[];
  repositories: readonly {
    name: string;
    defaultBranch: string;
    status: string;
  }[];
}

export interface AddMemberValues {
  employeeId: string;
  collaborationTerm: string;
}

export interface GitLabConnectionValues {
  url: string;
  credentialReference: string;
}

export type WorkspaceTabKey = 'members' | 'repositories' | 'settings';
