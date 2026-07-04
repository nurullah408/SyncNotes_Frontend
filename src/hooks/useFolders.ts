import { db } from "@/db/syncNotesDb";
import { QUERY_KEYS } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";

export function useFolders() {
  return useQuery({
    queryKey: QUERY_KEYS.lists(),
    queryFn: async () => {
      return db.folders.reverse().sortBy("lastUpdated");
    },
    staleTime: Infinity,
  });
}
