import type { DialogPropsMap } from "@/types/DialogPropsMap";
import type { ModalType } from "@/types/ModalType";
import { create } from "zustand";

type GlobalState = {
  activeModal: ModalType | null;
  modalProps: unknown | null;
};

type StoreActions = {
  openModal: <T extends ModalType>(
    modalType: T,
    props: DialogPropsMap[T] | null,
  ) => void;
  closeModal: () => void;
};

export const useGlobalStore = create<GlobalState & StoreActions>(
  (set) => ({
    activeModal: null,
    modalProps: null,
    openModal: (activeModal: ModalType, modalProps = null) => {
      set({
        activeModal,
        modalProps,
      });
    },
    closeModal: () => set({ activeModal: null, modalProps: null }),
  }),
);
