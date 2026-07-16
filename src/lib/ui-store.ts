import { create } from "zustand";

/** Mobil sidebar holati. Sidebar va AppHeader alohida komponentlar bo'lgani
 *  uchun ochiq/yopiq holat shu yerda bo'lishiladi. */
type SidebarState = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

export const useSidebar = create<SidebarState>((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
  close: () => set({ open: false }),
}));
