import {
  EditOutlined,
  FileTextOutlined,
  MessageOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Button, Input, Modal } from 'antd';
import { useState } from 'react';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import { useStyles } from './index.style';

type SkillCreateMode = 'chat' | 'pick' | 'zip';

interface SkillCreateModalProps {
  open: boolean;
  onClose: () => void;
  onManual: () => void;
}

const CHAT_DRAFT_NAME = '接口错误码规范';

export function SkillCreateModal({
  open,
  onClose,
  onManual,
}: SkillCreateModalProps) {
  const { styles } = useStyles();
  const showStaticAction = useStaticPrototypeAction();
  const [mode, setMode] = useState<SkillCreateMode>('pick');
  const [chatPrompt, setChatPrompt] = useState('');
  const [chatDraftReady, setChatDraftReady] = useState(false);

  const finishStaticAction = (action: string) => {
    showStaticAction(action);
    onClose();
  };

  if (mode === 'chat') {
    return (
      <Modal
        destroyOnHidden
        footer={null}
        onCancel={onClose}
        open={open}
        title="对话生成技能"
        width={520}
      >
        {chatDraftReady ? (
          <div className={styles.createFlow}>
            <div className={styles.chatDraft}>
              <span className={styles.createHint}>
                AI 草稿 · 基于你的描述生成
              </span>
              <dl className={styles.chatDraftDetails}>
                <dt>名称</dt>
                <dd>
                  <strong>{CHAT_DRAFT_NAME}</strong>
                </dd>
                <dt>类型</dt>
                <dd>仓库规范 · v1.0</dd>
                <dt>适用</dt>
                <dd>通用 · HTTP API</dd>
                <dt>来源</dt>
                <dd>{chatPrompt}</dd>
              </dl>
              <p className={styles.chatDraftSummary}>
                草稿包含：错误码六位结构、复用与登记规则、响应示例。确认后仅展示静态反馈，不会写入技能目录。
              </p>
            </div>
            <div className={styles.createFooter}>
              <Button onClick={() => setChatDraftReady(false)}>返回修改</Button>
              <Button
                onClick={() =>
                  finishStaticAction(`对话生成技能 ${CHAT_DRAFT_NAME}`)
                }
                type="primary"
              >
                确认创建
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.createFlow}>
            <label
              className={styles.createHint}
              htmlFor="admin-skill-create-chat-prompt"
            >
              用一句话描述要生成的规范
            </label>
            <Input.TextArea
              id="admin-skill-create-chat-prompt"
              onChange={(event) => setChatPrompt(event.target.value)}
              placeholder="示例：为所有 HTTP API 制定统一的错误码规范，含结构、复用规则和响应示例"
              rows={3}
              value={chatPrompt}
            />
            <div className={styles.createFooter}>
              <Button onClick={onClose}>取消</Button>
              <Button
                disabled={!chatPrompt.trim()}
                onClick={() => setChatDraftReady(true)}
                type="primary"
              >
                生成草稿
              </Button>
            </div>
          </div>
        )}
      </Modal>
    );
  }

  if (mode === 'zip') {
    return (
      <Modal
        destroyOnHidden
        footer={null}
        onCancel={onClose}
        open={open}
        title="导入 ZIP 生成技能"
        width={460}
      >
        <div className={styles.createFlow}>
          <div className={styles.zipFileCard}>
            <span aria-hidden className={styles.creationIcon}>
              <FileTextOutlined />
            </span>
            <span className={styles.zipFileMeta}>
              <strong className={styles.code}>fe-standards.zip</strong>
              <span>14 个文件 · 已就绪（演示文件）</span>
            </span>
          </div>
          <ol className={styles.zipSteps}>
            <li>解压并扫描 markdown 文档</li>
            <li>识别 3 个规范文档（代码风格 / 提交 / 评审清单）</li>
            <li>合并生成 skill.md 草稿，评审清单转为 Agent 自检项</li>
          </ol>
          <p className={styles.staticNotice} role="status">
            当前为静态原型演示文件，不会读取或上传本地 ZIP。
          </p>
          <div className={styles.createFooter}>
            <Button onClick={onClose}>取消</Button>
            <Button
              onClick={() => finishStaticAction('导入 ZIP 生成技能')}
              type="primary"
            >
              解析并生成
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title="新建技能"
      width={540}
    >
      <div className={styles.creationGrid}>
        <Button
          aria-label="对话生成：描述目标，AI 生成规范草稿"
          className={styles.creationOption}
          onClick={() => setMode('chat')}
          type="text"
        >
          <span className={styles.creationOptionContent}>
            <span aria-hidden className={styles.creationIcon}>
              <MessageOutlined />
            </span>
            <strong>对话生成</strong>
            <span className={styles.creationDescription}>
              描述目标，AI 生成规范草稿
            </span>
          </span>
        </Button>
        <Button
          aria-label="导入 ZIP：上传规范文档包，解析生成"
          className={styles.creationOption}
          onClick={() => setMode('zip')}
          type="text"
        >
          <span className={styles.creationOptionContent}>
            <span aria-hidden className={styles.creationIcon}>
              <UploadOutlined />
            </span>
            <strong>导入 ZIP</strong>
            <span className={styles.creationDescription}>
              上传规范文档包，解析生成
            </span>
          </span>
        </Button>
        <Button
          aria-label="手动创建：按表单逐项填写"
          className={styles.creationOption}
          onClick={onManual}
          type="text"
        >
          <span className={styles.creationOptionContent}>
            <span aria-hidden className={styles.creationIcon}>
              <EditOutlined />
            </span>
            <strong>手动创建</strong>
            <span className={styles.creationDescription}>按表单逐项填写</span>
          </span>
        </Button>
      </div>
    </Modal>
  );
}
