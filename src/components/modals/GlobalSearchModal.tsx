import { useState, type ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { BASE_URL } from "@/constants";
import type { ApiResponse } from "@/types/response/ApiResponse";
import type { SearchNoteResult } from "@/types/NoteSearchResult";
import { useNavigate } from "@tanstack/react-router";
import { SanitizedHTMLMarkup } from "../sanitized-html-markup";
import { useGlobalStore } from "@/store/store";
import { useDebouncedCallback } from "@/hooks/useDebounce";

interface GlobalSearchModalProps {
  onClose: () => void;
}

export function GlobalSearchModal({ onClose }: GlobalSearchModalProps) {
  const [search, setSearch] = useState("");

  const debouncedSetSearch = useDebouncedCallback(
    (searchQuery: string) => setSearch(searchQuery),
    500,
  );

  function onChangeSearch(event: ChangeEvent<HTMLInputElement>) {
    debouncedSetSearch(event.currentTarget.value);
  }

  const { data: results, isLoading } = useQuery<
    ApiResponse<SearchNoteResult[]>
  >({
    queryFn: async () => {
      const results = await apiClient(
        `${BASE_URL}/notes/search?query=${encodeURIComponent(search)}`,
        {
          method: "GET",
        },
      );
      return await results.json();
    },
    queryKey: ["notes", "search", search],
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
          className="min-w-2xl max-h-xl overflow-hidden rounded-[10px]"
        >
          <DialogDescription>Search your notes globally</DialogDescription>
          <DialogHeader>
            <DialogTitle className="text-sm">Global Search</DialogTitle>
            <Input
              className="flex-2"
              placeholder={"Search"}
              onChange={onChangeSearch}
              autoFocus
            />
          </DialogHeader>
          <div className="grid gap-1 overflow-y-auto">
            {isLoading
              ? Array.from({ length: 1 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse duration-500 w-full h-10"
                  />
                ))
              : results?.data?.map((res, i) => (
                  <SearchResult key={i} {...res} />
                ))}
            {!isLoading && search.length === 0 && (
              <span className="text-center text-muted-foreground">
                Type your query to get started
              </span>
            )}
            {!isLoading &&
              search.length !== 0 &&
              results?.data?.length === 0 && (
                <span className="text-center text-muted-foreground">
                  No results found
                </span>
              )}
          </div>
        </DialogContent>
      </form>
    </Dialog>
  );
}

function SearchResult({
  id,
  title,
  updatedAt,
  searchContent,
}: SearchNoteResult) {
  const navigate = useNavigate();
  const closeModal = useGlobalStore((state) => state.closeModal);
  const onClick =
   async () => {
    closeModal();
    await navigate({
      to: "/notes/$noteId",
      params: {
        noteId: id,
      },
    });
  };

  return (
    <button
      onClick={onClick}
      aria-description="Note link"
      className="w-full grid text-left hover:bg-accent hover:cursor-pointer p-1 rounded-lg"
    >
      <span className="text-lg font-bold">{title}</span>
      <div>
        <SanitizedHTMLMarkup snippet={searchContent + "..."} />
      </div>
      <p className="text-xs">
        Last Updated:{" "}
        <span className="italic">
          {new Date(updatedAt || "").toLocaleString()}
        </span>
      </p>
    </button>
  );
}
