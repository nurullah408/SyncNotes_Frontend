import type { ModalType } from "@/types/ModalType";
import type { User } from "@/types/User";
import { create } from "zustand";

type GlobalState = {
  user: User | null;
  activeModal: ModalType | null;
  modalProps: unknown | null;
};

type StoreActions = {
  setUser: (user: User | null) => void;
  getUser: () => User | null;
  openModal: (modalType: ModalType, props: unknown) => void;
  closeModal: () => void;
};

export const useGlobalStore = create<GlobalState & StoreActions>(
  (set, get) => ({
    // User Functions & State
    user: null,
    setUser: (user: User | null) => {
      set({ user });
    },
    getUser: () => {
      return get().user;
    },
    // Modal Functions & State
    activeModal: null,
    modalProps: null,
    openModal: (activeModal: ModalType, modalProps = null) =>
      set({
        activeModal,
        modalProps,
      }),
    closeModal: () => set({ activeModal: null, modalProps: null }),
  }),
);
