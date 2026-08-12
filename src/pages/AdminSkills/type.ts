export interface SkillItem {
  key: string;
  name: string;
  version: string;
  stack: string;
  content: string;
  status: 'active' | 'inactive';
  type: 'SDD 方法' | '仓库规范' | '平台默认';
  usage: string;
  locked?: boolean;
}

export interface SkillFormValues {
  changeNote?: string;
  name: string;
  newVersion?: string;
  type: SkillItem['type'];
  stack: string;
  content: string;
  version: string;
}
