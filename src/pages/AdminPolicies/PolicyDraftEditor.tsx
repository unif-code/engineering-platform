import { Form, InputNumber, Select, Typography } from 'antd';
import type { PolicyCatalogItem, PolicyValue } from '@/features/administration';
import { formatPolicyValue, POLICY_VALUE_TYPE_LABEL } from './constant';
import { useStyles } from './index.style';
import type { DraftContent } from './type';

interface PolicyDraftEditorProps {
  catalog: PolicyCatalogItem[];
  content: DraftContent;
  onChange: (key: string, value: PolicyValue | null) => void;
}

export function PolicyDraftEditor({
  catalog,
  content,
  onChange,
}: PolicyDraftEditorProps) {
  const { styles } = useStyles();

  return (
    <Form component="div" layout="vertical">
      <div className={styles.settingList}>
        {catalog.map((item) => (
          <section
            aria-label={`${item.label}策略`}
            className={styles.settingRow}
            key={item.key}
          >
            <div className={styles.settingInfo}>
              <Typography.Text strong>{item.label}</Typography.Text>
              <Typography.Text type="secondary">
                {item.description}
              </Typography.Text>
              <Typography.Text className={styles.code} type="secondary">
                {item.key} · {POLICY_VALUE_TYPE_LABEL[item.valueType]} ·{' '}
                {item.effectSemantics}
              </Typography.Text>
            </div>
            <div className={styles.settingControl}>
              <Form.Item className={styles.settingFormItem}>
                {item.valueType === 'INTEGER' ? (
                  <InputNumber
                    aria-label={item.label}
                    changeOnBlur={false}
                    className={styles.fullWidth}
                    id={`policy-${item.key.replaceAll('.', '-')}`}
                    max={item.max}
                    min={item.min}
                    onChange={(value) => onChange(item.key, value)}
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
              </Form.Item>
              {content[item.key] !== item.activeValue ? (
                <Typography.Text className={styles.changeHint}>
                  草稿 · 原值 {formatPolicyValue(item.activeValue, item.unit)}
                </Typography.Text>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </Form>
  );
}
