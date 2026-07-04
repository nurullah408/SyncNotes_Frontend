import { BASE_URL } from "@/constants";
import { db } from "@/db/syncNotesDb";
import { apiClient } from "@/lib/api-client";
import type { Folder } from "@/types/Folder";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useFolderMutations() {
  const queryClient = useQueryClient();

  // 1. Create Folder Mutation
  const createFolder = useMutation({
    mutationFn: async (payload: Folder) => {
      // Step A: Optimistic Write to Dexie instantly so UI responds
      await db.folders.put(payload);
      // Step B: Send to backend API
      const response = await apiClient(`${BASE_URL}/folders`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to update folder to server");
      }
      return await response.json();
    },
    onSuccess: async (payload) => {
      await db.folders.update(payload.id, {
        ...payload,
        updatedAt: new Date(payload.updatedAt).toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (err) => {
      toast.error("Failed to update folder");
      console.error(err);
    },
  });
  // 2. update Folder mutation
  const updateFolder = useMutation({
    mutationFn: async (payload: Folder) => {
      // Step A: Optimistic Write to Dexie instantly so UI responds
      await db.folders.update(payload.id, payload);
      // Step B: Send to backend API
      const response = await apiClient(`${BASE_URL}/folders/${payload.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to save folder to server");
      }
      return await response.json();
    },
    onSuccess: async (payload) => {
      await db.folders.update(payload.id, {
        ...payload,
        updatedAt: new Date(payload.updatedAt).toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (err) => {
      toast.error("Failed to update folder");
      console.error(err);
    },
  });
  // 3. Delete Folder mutation
  const deleteFolder = useMutation({
    mutationFn: async (payload: Folder) => {
      // Step A: Optimistic Write to Dexie instantly so UI responds
      await db.folders.update(payload.id, {
        isDeleted: true,
        updatedAt: new Date().toISOString(),
      });
      // Step B: Send to backend API
      const response = await apiClient(`${BASE_URL}/folders/${payload.id}`, {
        method: "DELETE",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to delete folder to server");
      }
      return await response.json();
    },
    onSuccess: async (payload) => {
      await db.folders.update(payload.id, {
        isDeleted: true,
        updatedAt: new Date(payload.updatedAt).toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (err) => {
      toast.error("Failed to delete folder");
      console.error(err);
    },
  });
  return {
    createFolder,
    updateFolder,
    deleteFolder,
  };
}
