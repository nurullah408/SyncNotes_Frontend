import { useDeferredValue, useState, type ChangeEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { BASE_URL } from "@/constants";
import type { ApiResponse } from "@/types/response/ApiResponse";
import type { NoteSearchResult } from "@/types/NoteSearchResult";

interface GlobalSearchModalProps {
  onClose: () => void;
}

export function GlobalSearchModal({ onClose }: GlobalSearchModalProps) {
  const [search, setSearch] = useState("");

  const deferredSearch = useDeferredValue(search);

  function onChangeSearch(event: ChangeEvent<HTMLInputElement>) {
    setSearch(event.currentTarget.value);
  }

  const { data: results, isLoading } = useQuery<
    ApiResponse<NoteSearchResult[]>
  >({
    queryFn: async () => {
      const results = await apiClient(
        `${BASE_URL}/notes/search?query=${encodeURIComponent(deferredSearch)}`,
        {
          method: "GET",
        },
      );
      return await results.json();
    },
    queryKey: ["notes", "search", deferredSearch],
    enabled: deferredSearch.length > 0,
  });

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <form>
        <DialogContent
          aria-describedby="This is a modal search"
          className="rounded-[10px]"
        >
          <DialogHeader>
            <DialogTitle className="text-sm">Global Search</DialogTitle>
            <Input
              className="flex-2"
              placeholder={"Search"}
              onChange={onChangeSearch}
              autoFocus
            />
          </DialogHeader>
          <div className="grid gap-1">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse duration-500 h-5 w-full"
                  />
                ))
              : results?.data?.map((res, i) => (
                  <div key={i}>{JSON.stringify(res)}</div>
                ))}
            {!isLoading && results?.data?.length === 0 && "No results found"}
          </div>
        </DialogContent>
      </form>
    </Dialog>
  );
}
