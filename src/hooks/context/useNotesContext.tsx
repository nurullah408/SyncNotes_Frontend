import { useContext } from "react";
import { NotesContext } from "../context/NotesContext";

export const useNotesContext = () => {
    const context = useContext(NotesContext);
    if (!context) {
        throw new Error(
            "useNotesFilterContext must be used within a NotesFilterContext",
        );
    }
    return context;
};
