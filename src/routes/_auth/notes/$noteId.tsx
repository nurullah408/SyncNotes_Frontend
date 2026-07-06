import { createFileRoute } from "@tanstack/react-router";
import { Note } from "./-components/noteId";

export const Route = createFileRoute("/_auth/notes/$noteId")({
  component: Note,
});
