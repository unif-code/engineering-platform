import { useMutation, useQuery } from '@umijs/max';

const queryOptions = {
  queryFn: () =>
    Promise.resolve({
      value: 'query-result',
    }),
  queryKey: ['type-probe'] as const,
};

function useVerifiedReactQueryTypes() {
  const query = useQuery(queryOptions);
  const queryData = query.data;
  const mutation = useMutation({
    mutationFn: (value: string) => Promise.resolve({ value }),
  });
  const mutationData = mutation.data;
  // @ts-expect-error 类型完整时必须拒绝不存在的字段；若退化为 any，该指令会因未使用而让 tsc 失败。
  void queryData?.missingTypeProbe;
  // @ts-expect-error 类型完整时必须拒绝不存在的字段；若退化为 any，该指令会因未使用而让 tsc 失败。
  void mutationData?.missingTypeProbe;
  return { mutationData, queryData };
}

void useVerifiedReactQueryTypes;
