import { api, type components } from '@/services/generated';
import { mutationHeaders, requireApiData } from '@/services/transport';
import type {
  OrganizationTreeResponse,
  SetOrganizationSuperiorInput,
} from './type';

export async function getOrganizationTree(): Promise<OrganizationTreeResponse> {
  const tree = requireApiData(await api.GET('/api/v1/admin/organization/tree'));
  const toNode = (
    account: components['schemas']['AccountRefDto'],
    kind: 'LEADER' | 'MANAGER' | 'MEMBER',
    superiorId: string | null,
    children: OrganizationTreeResponse['items'] = [],
  ) => ({ ...account, children, kind, superiorId });

  return {
    items: tree.managers.map((manager) =>
      toNode(
        manager.account,
        'MANAGER',
        null,
        manager.leaders.map((leader) =>
          toNode(
            leader.account,
            'LEADER',
            manager.account.id,
            leader.members.map((member) =>
              toNode(member, 'MEMBER', leader.account.id),
            ),
          ),
        ),
      ),
    ),
  };
}

export async function setOrganizationSuperior(
  accountId: string,
  input: SetOrganizationSuperiorInput,
): Promise<void> {
  await api.PUT('/api/v1/admin/accounts/{accountId}/superior', {
    body: input,
    params: {
      header: mutationHeaders(),
      path: { accountId },
    },
  });
}

export type {
  OrganizationKind,
  OrganizationNode,
  OrganizationTreeResponse,
  SetOrganizationSuperiorInput,
} from './type';
