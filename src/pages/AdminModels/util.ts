import type { ProTableProps } from '@ant-design/pro-components';
import { MODEL_EVALUATION_ROWS, MODEL_ROWS } from './constant';
import type {
  ModelEvaluationQueryParams,
  ModelEvaluationRow,
  ModelQueryParams,
  ModelRow,
} from './type';

type ModelRequest = NonNullable<
  ProTableProps<ModelRow, ModelQueryParams>['request']
>;
type ModelSort = Parameters<ModelRequest>[1];
type ModelFilter = Parameters<ModelRequest>[2];
type SortableModelField = 'contextWindow' | 'updatedAt';

const SORTABLE_FIELDS: readonly SortableModelField[] = [
  'contextWindow',
  'updatedAt',
];

export function selectModelRows(
  params: ModelQueryParams,
  sort: ModelSort = {},
  filter: ModelFilter = {},
): ModelRow[] {
  const keyword = params.keyword?.trim().toLocaleLowerCase();
  const statuses =
    params.status && params.status !== 'all'
      ? [params.status]
      : filter.status?.map(String);

  const selected = MODEL_ROWS.filter((row) => {
    const matchesKeyword =
      !keyword ||
      [row.id, row.name, row.provider, row.purpose].some((value) =>
        value.toLocaleLowerCase().includes(keyword),
      );
    const matchesStatus = !statuses?.length || statuses.includes(row.status);

    return matchesKeyword && matchesStatus;
  });

  const sortField = SORTABLE_FIELDS.find(
    (field) => sort[field] === 'ascend' || sort[field] === 'descend',
  );

  if (sortField) {
    const direction = sort[sortField] === 'ascend' ? 1 : -1;
    selected.sort((left, right) => {
      if (sortField === 'contextWindow') {
        return (left.contextWindow - right.contextWindow) * direction;
      }

      return left.updatedAt.localeCompare(right.updatedAt) * direction;
    });
  }

  return selected;
}

export const queryModelRows: NonNullable<
  ProTableProps<ModelRow, ModelQueryParams>['request']
> = async (params, sort, filter) => {
  const selected = selectModelRows(params, sort, filter);
  const current = Math.max(params.current ?? 1, 1);
  const pageSize = Math.max(params.pageSize ?? 10, 1);
  const offset = (current - 1) * pageSize;

  return {
    data: selected.slice(offset, offset + pageSize),
    success: true,
    total: selected.length,
  };
};

export const queryModelEvaluationRows: NonNullable<
  ProTableProps<ModelEvaluationRow, ModelEvaluationQueryParams>['request']
> = async () => ({
  data: MODEL_EVALUATION_ROWS.map((row) => ({ ...row })),
  success: true,
  total: MODEL_EVALUATION_ROWS.length,
});
