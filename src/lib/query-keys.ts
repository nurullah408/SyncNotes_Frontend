export const QUERY_KEYS = {
  all: ["notes"] as const,
  lists: () => [...QUERY_KEYS.all, "list"] as const,
  list: (filters: string) => [...QUERY_KEYS.lists(), { filters }] as const,
  detail: (id: string) => [...QUERY_KEYS.all, "detail", id] as const,
};
