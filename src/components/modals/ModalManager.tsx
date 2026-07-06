import { useGlobalStore } from "@/store/store";
import { GlobalSearchModal } from "./GlobalSearchModal";
import type { DialogPropsMap } from "@/types/DialogPropsMap";
import { FolderSearchModal } from "./FolderSearchModal";

export function ModalManager() {
  const activeModal = useGlobalStore((state) => state.activeModal);
  const closeModal = useGlobalStore((state) => state.closeModal);
  const modalProps = useGlobalStore((state) => state.modalProps);

  if (!activeModal) return null;

  switch (activeModal) {
    case "GLOBAL_SEARCH": {
      return <GlobalSearchModal onClose={closeModal} />;
    }
    case "MOVE_NOTE": {
      const moveFolderProps = modalProps as DialogPropsMap["MOVE_NOTE"];
      return (
        <FolderSearchModal
          noteId={moveFolderProps.noteId}
          onClose={closeModal}
        />
      );
    }
    default:
      return null;
  }
}
