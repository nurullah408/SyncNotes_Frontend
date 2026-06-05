import { NotesViewContext } from "@/context/NotesViewContext";
import { useContext } from "react";

export function useNotesViewContext() {
    const context = useContext(NotesViewContext);
    if (!context) {
        throw new Error(
            "useNotesViewContext must be used within a NotesViewContextProvider",
        );
    }
    return context;
}
