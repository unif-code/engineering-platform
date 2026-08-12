export interface GovernanceAccountRef {
  displayName: string;
  employeeNo: string;
  id: string;
}

export interface GovernanceWorkspaceRef {
  id: string;
  name: string;
}

export interface GovernanceCatalog {
  findAccount: (id: string) => GovernanceAccountRef | undefined;
  findWorkspace: (id: string) => GovernanceWorkspaceRef | undefined;
  registerAccount: (account: GovernanceAccountRef) => void;
  registerWorkspace: (workspace: GovernanceWorkspaceRef) => void;
}

const INITIAL_ACCOUNTS = [
  ['account-1', 'E1001', '王悦'],
  ['account-2', 'E1002', '吴桐'],
  ['account-3', 'E1003', '李强'],
  ['account-4', 'E1004', '陈晓'],
  ['account-5', 'E1005', '郑楠'],
  ['account-6', 'E1006', '徐蕾'],
  ['account-7', 'E1007', '赵敏'],
  ['account-8', 'E2001', '刘洋'],
  ['account-9', 'E2002', '何山'],
  ['account-10', 'E2003', '秦岚'],
  ['account-11', 'E3001', '罗成'],
  ['account-12', 'E3002', '康宁'],
  ['account-13', 'E0001', '孙杰'],
  ['account-14', 'E0000', '周天'],
] as const;

const INITIAL_WORKSPACES = [
  ['workspace-platform-core', '营销工作区'],
  ['workspace-agent-runtime', '交易工作区'],
  ['workspace-delivery-governance', '中台工作区'],
  ['workspace-marketing-archive', '历史活动专区'],
] as const;

export function createGovernanceCatalog(): GovernanceCatalog {
  const accounts = new Map<string, GovernanceAccountRef>(
    INITIAL_ACCOUNTS.map(([id, employeeNo, displayName]) => [
      id,
      { displayName, employeeNo, id },
    ]),
  );
  const workspaces = new Map<string, GovernanceWorkspaceRef>(
    INITIAL_WORKSPACES.map(([id, name]) => [id, { id, name }]),
  );

  return {
    findAccount: (id) => accounts.get(id),
    findWorkspace: (id) => workspaces.get(id),
    registerAccount: (account) => {
      accounts.set(account.id, { ...account });
    },
    registerWorkspace: (workspace) => {
      workspaces.set(workspace.id, { ...workspace });
    },
  };
}

export const governanceCatalog = createGovernanceCatalog();
