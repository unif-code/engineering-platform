export interface SkillItem {
  key: string;
  name: string;
  version: string;
  description: string;
  status: 'active' | 'deprecated';
  owner: string;
  updatedAt: string;
}

export interface SkillFormValues {
  name: string;
  key: string;
  version: string;
  description: string;
}
