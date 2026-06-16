import { useGlobalStore } from "@/store/store";
import { GlobalSearchModal } from "./GlobalSearchModal";

export function ModalManager() {
  const activeModal = useGlobalStore((state) => state.activeModal);
  const closeModal = useGlobalStore((state) => state.closeModal);

  if (!activeModal) return null;

  switch (activeModal) {
    case "GLOBAL_SEARCH":
      return <GlobalSearchModal onClose={closeModal} />;
    default:
      return null;
  }
}
