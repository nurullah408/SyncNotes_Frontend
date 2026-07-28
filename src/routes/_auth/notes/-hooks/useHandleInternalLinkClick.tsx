import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export function useHandleInternalLinkClick() {
  const navigate = useNavigate();
  useEffect(() => {
    function handleClickOnInternalLink(e: CustomEvent<{ noteId: string}>) {
      navigate({
        to: `/notes/$noteId`,
        params: { noteId: e.detail.noteId },
      });
    }

    window.addEventListener("internal-link:click", handleClickOnInternalLink as EventListener);
    return () => window.removeEventListener("internal-link:click", handleClickOnInternalLink as EventListener);
  }, [navigate]);
}
