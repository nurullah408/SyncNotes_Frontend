import { db } from "@/db/syncNotesDb";
import { QUERY_KEYS } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";

export function useNotes() {
  return useQuery({
    queryKey: QUERY_KEYS.notesList(),
    queryFn: async () => {
      return db.notes
        .filter((n) => !n.isDeleted)
        .reverse()
        .sortBy("lastUpdated");
    },
    staleTime: 1000 * 60 * 5,
  });
}
