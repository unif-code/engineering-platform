import {
  Alert,
  Button,
  Form,
  InputNumber,
  Select,
  Space,
  Typography,
} from 'antd';
import type {
  PolicyCatalogItem,
  PolicyDraft,
  PolicyValidationResult,
  PolicyValue,
} from '@/features/administration';
import { POLICY_VALUE_TYPE_LABEL } from './constant';
import { useStyles } from './index.style';
import type { DraftContent } from './type';

interface PolicyDraftEditorProps {
  catalog: PolicyCatalogItem[];
  conflict: string | undefined;
  content: DraftContent;
  dirty: boolean;
  draft: PolicyDraft;
  previewing: boolean;
  saveDisabled: boolean;
  saving: boolean;
  validating: boolean;
  validation: PolicyValidationResult | undefined;
  onChange: (key: string, value: PolicyValue | null) => void;
  onPreview: () => void;
  onPublish: () => void;
  onSave: () => void;
  onValidate: () => void;
}

export function PolicyDraftEditor({
  catalog,
  conflict,
  content,
  dirty,
  draft,
  onChange,
  onPreview,
  onPublish,
  onSave,
  onValidate,
  previewing,
  saveDisabled,
  saving,
  validating,
  validation,
}: PolicyDraftEditorProps) {
  const { styles } = useStyles();

  return (
    <section aria-label="Draft 编辑" className={styles.editor}>
      <div className={styles.editorHeader}>
        <div>
          <Typography.Title level={4}>Draft 编辑</Typography.Title>
          <Space size="small" wrap>
            <Typography.Text className={styles.code}>
              {draft.id}
            </Typography.Text>
            <Typography.Text>Base 版本 {draft.baseVersion}</Typography.Text>
            <Typography.Text type="secondary">
              revision {draft.revision}
            </Typography.Text>
          </Space>
        </div>
        <Space wrap>
          <Button disabled={saveDisabled} loading={saving} onClick={onSave}>
            保存 Draft
          </Button>
          <Button disabled={dirty} loading={validating} onClick={onValidate}>
            Validate
          </Button>
          <Button disabled={dirty} loading={previewing} onClick={onPreview}>
            Preview
          </Button>
          <Button disabled={dirty} onClick={onPublish} type="primary">
            Publish
          </Button>
        </Space>
      </div>

      {conflict ? <Alert showIcon title={conflict} type="error" /> : null}

      {validation ? (
        validation.valid ? (
          <Alert showIcon title="Validation 通过" type="success" />
        ) : (
          <Alert
            description={
              <ul aria-label="Validation issues">
                {validation.issues.map((issue) => (
                  <li key={`${issue.key}-${issue.code}`}>{issue.message}</li>
                ))}
              </ul>
            }
            showIcon
            title="Validation 未通过"
            type="warning"
          />
        )
      ) : null}

      <Form component="div" layout="vertical">
        <div className={styles.editorFields}>
          {catalog.map((item) => (
            <Form.Item
              extra={`${POLICY_VALUE_TYPE_LABEL[item.valueType]} · ${item.description}`}
              key={item.key}
              label={item.label}
            >
              {item.valueType === 'INTEGER' ? (
                <InputNumber
                  aria-label={item.label}
                  changeOnBlur={false}
                  className={styles.fullWidth}
                  id={`policy-${item.key.replaceAll('.', '-')}`}
                  max={item.max}
                  min={item.min}
                  onChange={(value) => {
                    onChange(item.key, value);
                  }}
                  onInput={(text) => {
                    if (text.trim().length === 0) {
                      onChange(item.key, null);
                      return;
                    }
                    const value = Number(text);
                    if (Number.isFinite(value)) {
                      onChange(item.key, value);
                    }
                  }}
                  suffix={item.unit}
                  value={
                    typeof content[item.key] === 'number'
                      ? (content[item.key] as number)
                      : null
                  }
                />
              ) : (
                <Select
                  aria-label={item.label}
                  className={styles.fullWidth}
                  id={`policy-${item.key.replaceAll('.', '-')}`}
                  onChange={(value) => onChange(item.key, value)}
                  options={item.enumOptions?.map((option) => ({ ...option }))}
                  value={
                    typeof content[item.key] === 'string'
                      ? (content[item.key] as string)
                      : undefined
                  }
                  virtual={false}
                />
              )}
              <span className={styles.fieldHint}>{item.effectSemantics}</span>
            </Form.Item>
          ))}
        </div>
      </Form>
    </section>
  );
}
