import { db } from "@/db/syncNotesDb";
import { QUERY_KEYS } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";

export function useNoteDetail(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.notesDetail(id),
    queryFn: async () => {
      if (!id) return null;
      const note = await db.notes.get(id);
      if (!note || note.isDeleted) return null;
      return note;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}
