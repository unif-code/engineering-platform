import { PageContainer } from '@ant-design/pro-components';
import { useState } from 'react';
import { WORKSPACE_FIXTURES } from './constant';
import { useStyles } from './index.style';
import type { WorkspaceFixture } from './type';
import { WorkspaceDetail } from './WorkspaceDetail';
import { WorkspaceSelector } from './WorkspaceSelector';

const DEFAULT_WORKSPACE = WORKSPACE_FIXTURES[0];

export default function WorkspacesPage() {
  const { styles } = useStyles();
  const [selectedWorkspace, setSelectedWorkspace] =
    useState<WorkspaceFixture>(DEFAULT_WORKSPACE);

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.masterDetail}>
        <WorkspaceSelector
          onSelect={setSelectedWorkspace}
          selectedId={selectedWorkspace.id}
          workspaces={WORKSPACE_FIXTURES}
        />
        <WorkspaceDetail
          key={selectedWorkspace.id}
          workspace={selectedWorkspace}
        />
      </div>
    </PageContainer>
  );
}
