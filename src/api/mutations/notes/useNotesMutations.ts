import { BASE_URL } from "@/constants";
import { db } from "@/db/syncNotesDb";
import { apiClient } from "@/lib/api-client";
import type { Note } from "@/types/Note";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useNotesMutations() {
  const queryClient = useQueryClient();

  // 1. Create Folder Mutation
  const createNote = useMutation({
    mutationFn: async (payload: Note) => {
      // Step A: Optimistic Write to Dexie instantly so UI responds
      await db.notes.put(payload);
      // Step B: Send to backend API
      const response = await apiClient(`${BASE_URL}/notes`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to update note to server");
      }
      return await response.json();
    },
    onSuccess: async (payload) => {
      await db.notes.update(payload.id, {
        ...payload,
        updatedAt: new Date(payload.updatedAt).toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (err) => {
      toast.error("Failed to update note");
      console.error(err);
    },
  });
  // 2. update Folder mutation
  const updateNote = useMutation({
    mutationFn: async (payload: Note) => {
      // Step A: Optimistic Write to Dexie instantly so UI responds
      await db.notes.update(payload.id, payload);
      // Step B: Send to backend API
      const response = await apiClient(`${BASE_URL}/notes/${payload.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to save Note to server");
      }
      return await response.json();
    },
    onSuccess: async (payload) => {
      await db.notes.update(payload.id, {
        ...payload,
        updatedAt: new Date(payload.updatedAt).toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (err) => {
      toast.error("Failed to update Note");
      console.error(err);
    },
  });
  // 3. Delete Folder mutation
  const deleteNote = useMutation({
    mutationFn: async (payload: Note) => {
      // Step A: Optimistic Write to Dexie instantly so UI responds
      await db.notes.update(payload.id, {
        isDeleted: true,
        updatedAt: new Date().toISOString(),
      });
      // Step B: Send to backend API
      const response = await apiClient(`${BASE_URL}/notes/${payload.id}`, {
        method: "DELETE",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to delete note to server");
      }
      return await response.json();
    },
    onSuccess: async (payload) => {
      await db.notes.update(payload.id, {
        isDeleted: true,
        updatedAt: new Date(payload.updatedAt).toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (err) => {
      toast.error("Failed to delete note");
      console.error(err);
    },
  });
  return {
    createNote,
    updateNote,
    deleteNote,
  };
}
