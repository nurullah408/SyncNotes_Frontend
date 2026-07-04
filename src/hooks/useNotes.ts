import { db } from "@/db/syncNotesDb";
import { QUERY_KEYS } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";

export function useNotes() {
  return useQuery({
    queryKey: QUERY_KEYS.lists(),
    queryFn: async () => {
      return db.notes.reverse().sortBy("lastUpdated");
    },
    staleTime: Infinity,
  });
}
