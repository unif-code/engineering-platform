export interface WorkspaceFixture {
  archived?: boolean;
  canManage: boolean;
  foundRepositoryCount: number;
  id: string;
  name: string;
  membership: 'Owner' | '成员' | '平台视图' | '临时协作';
  members: readonly {
    employeeId: string;
    name: string;
    role: string;
    tag?: 'disabled' | 'owner' | 'temporary';
  }[];
  owner: string;
  repositories: readonly {
    name: string;
    selected: boolean;
    stack: string;
  }[];
  team: '营销' | '交易' | '中台';
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
