import { NotesContextProvider } from "@/context/NotesContext";
import type { Note } from "@/types/Note";
import { useState, type ChangeEvent, type MouseEvent } from "react";
import { NoteListHeader } from "./NoteListHeader";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { NoteCard } from "./NoteCard";
import { FilterFloatingBar } from "./FilterFloatingBar";
import { useNavigate } from "@tanstack/react-router";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { NotesViewProvider } from "@/context/NotesViewContext";
import { useNoteActions } from "@/hooks/useNoteActions";
import { useNotesContext } from "@/hooks/context/useNotesContext";
import { useNotesViewContext } from "@/hooks/context/useNotesViewContext";

interface NotesProps {
  notes: Note[] | undefined;
}

export function Notes({ notes }: NotesProps) {
  const navigate = useNavigate();

  const { createNote, saveNote, deleteNotes } = useNoteActions();

  const [isMultiSelect, setIsMultiSelect] = useState(false);

  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(
    new Set(),
  );

  const [view, setView] = useLocalStorage<"list" | "grid">("view", "list");

  function onCardClick(event: MouseEvent, noteId: string) {
    event.preventDefault();
    if (isMultiSelect) {
      setSelectedNoteIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(noteId)) {
          newSet.delete(noteId);
        } else {
          newSet.add(noteId);
        }
        return newSet;
      });
      return;
    }
    navigate({
      to: "/notes/$noteId",
      params: {
        noteId,
      },
      viewTransition: {
        types: ["slide-left"],
      },
    });
  }

  async function onClickAddNote(event: MouseEvent) {
    event.preventDefault();
    const note = createNote({ title: `Untitled` });
    saveNote(note);
  }

  function onCheckboxChange(
    event: ChangeEvent<HTMLButtonElement>,
    noteId: string,
  ) {
    event.preventDefault();
    setSelectedNoteIds((prev) => {
      const newSet = new Set(prev);
      if (!newSet.has(noteId)) {
        newSet.add(noteId);
      } else {
        newSet.delete(noteId);
      }
      return newSet;
    });
  }

  function onSelectAll() {
    setSelectedNoteIds(new Set(notes?.map((note) => note.id)));
  }

  async function onDeleteSelected() {
    if (selectedNoteIds.size === 0) return;
    const noteIds = Array.from(selectedNoteIds);
    await deleteNotes(noteIds);
    setSelectedNoteIds(new Set());
  }

  return (
    <NotesContextProvider
      value={{
        isMultiSelect,
        setIsMultiSelect,
        selectedNoteIds,
        setSelectedNoteIds,
        onCheckboxChange,
        onDeleteSelected,
        onSelectAll,
      }}
    >
      <NotesViewProvider value={{ view, setView }}>
        <NoteListHeader title="My Notes" onClickAddNote={onClickAddNote} />
        <NoteList
          notes={notes}
          onCheckboxChange={onCheckboxChange}
          onCardClick={onCardClick}
        />
      </NotesViewProvider>
    </NotesContextProvider>
  );
}

interface NoteListProps extends NotesProps {
  onCheckboxChange: (
    event: ChangeEvent<HTMLButtonElement>,
    noteId: string,
  ) => void;
  onCardClick: (event: MouseEvent, noteId: string) => void;
}

function NoteList({ notes, onCheckboxChange, onCardClick }: NoteListProps) {
  const { isMultiSelect, selectedNoteIds } = useNotesContext();
  const { view } = useNotesViewContext();
  return (
    <div
      className={`relative grid ${view === "list" ? "content-start" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"} gap-2 h-full p-2 overflow-y-auto`}
    >
      {!notes
        ? Array.from({ length: 5 }).map((_, index) => (
            <Card
              key={index}
              className="min-h-10 pointer-events-none rounded-lg duration-150 hover:cursor-none animate-pulse"
            />
          ))
        : notes.map((note) => (
            <div key={note.id} className="flex items-start gap-1">
              <Checkbox
                className={`${isMultiSelect ? "visible size-5" : "invisible size-0 pointer-events-none"}`}
                checked={selectedNoteIds.has(note.id)}
                onChange={(event) => onCheckboxChange(event, note.id)}
              />
              <NoteCard
                onClick={(event) => onCardClick(event, note.id)}
                key={note.id}
                {...note}
                className="min-h-30 flex-2 m-0 rounded-lg duration-150 hover:cursor-pointer hover:-translate-y-1 hover:shadow-lg gap-1"
              />
            </div>
          ))}
      <FilterFloatingBar />
    </div>
  );
}
