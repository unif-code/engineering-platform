export interface RoleFixture {
  id: string;
  name: string;
  capabilities: readonly string[];
  memberCount: number;
  locked?: boolean;
}

export interface CapabilityOption {
  id: string;
  label: string;
}

export interface CapabilityGroup {
  key: 'business' | 'view' | 'admin';
  title: string;
  capabilities: readonly CapabilityOption[];
}

export interface RoleFormValues {
  name: string;
  description?: string;
  initialCapability: string;
}
