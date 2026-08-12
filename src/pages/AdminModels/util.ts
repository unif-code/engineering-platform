import type { ProTableProps } from '@ant-design/pro-components';
import { MODEL_EVALUATION_ROWS, MODEL_ROWS } from './constant';
import type {
  ModelEvaluationQueryParams,
  ModelEvaluationRow,
  ModelQueryParams,
  ModelRow,
} from './type';

export const queryModelRows: NonNullable<
  ProTableProps<ModelRow, ModelQueryParams>['request']
> = async (params) => {
  const current = Math.max(params.current ?? 1, 1);
  const pageSize = Math.max(params.pageSize ?? 10, 1);
  const offset = (current - 1) * pageSize;

  return {
    data: MODEL_ROWS.slice(offset, offset + pageSize),
    success: true,
    total: MODEL_ROWS.length,
  };
};

export const queryModelEvaluationRows: NonNullable<
  ProTableProps<ModelEvaluationRow, ModelEvaluationQueryParams>['request']
> = async () => ({
  data: MODEL_EVALUATION_ROWS.map((row) => ({ ...row })),
  success: true,
  total: MODEL_EVALUATION_ROWS.length,
});
