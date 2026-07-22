import { createFileRoute } from "@tanstack/react-router";
import { Note } from "./-components/noteId";

export const Route = createFileRoute("/_auth/notes/$noteId")({
  component: NoteId,
});

function NoteId() {
  const params = Route.useParams();
  return <Note key={params.noteId} />
}
