import '@umijs/max/typings';

declare module '@umijs/max' {
  export const useMutation: typeof import('@tanstack/react-query').useMutation;
  export const useQuery: typeof import('@tanstack/react-query').useQuery;
}
