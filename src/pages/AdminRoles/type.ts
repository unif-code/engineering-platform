export interface RoleFixture {
  id: string;
  name: string;
  description: string;
  capabilities: readonly string[];
  memberCount: number;
}

export interface CapabilityOption {
  id: string;
  label: string;
}

export interface CapabilityGroup {
  key: 'requirement' | 'artifact' | 'execution' | 'promotion';
  title: string;
  description: string;
  capabilities: readonly CapabilityOption[];
}

export interface RoleFormValues {
  name: string;
  description: string;
}
