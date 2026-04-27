import { create } from 'zustand';

interface LayoutState {
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
  setLeftSidebarCollapsed: (collapsed: boolean) => void;
  setRightSidebarCollapsed: (collapsed: boolean) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
}

// Keys to persist collapse state across reloads.
const LS_LEFT = 'studysync:layout:leftSidebar';
const LS_RIGHT = 'studysync:layout:rightSidebar';

// Viewport width breakpoint: auto-collapse both sidebars below this.
const AUTO_COLLAPSE_BELOW_PX = 1280;

function readInitial(key: string, fallback: boolean): boolean {
  if (typeof localStorage === 'undefined') return fallback;
  const v = localStorage.getItem(key);
  if (v === 'collapsed') return true;
  if (v === 'expanded') return false;
  return fallback;
}

// On first load pick default based on viewport width.
function defaultCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < AUTO_COLLAPSE_BELOW_PX;
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  leftSidebarCollapsed: readInitial(LS_LEFT, defaultCollapsed()),
  rightSidebarCollapsed: readInitial(LS_RIGHT, defaultCollapsed()),
  setLeftSidebarCollapsed: (collapsed) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(LS_LEFT, collapsed ? 'collapsed' : 'expanded');
    set({ leftSidebarCollapsed: collapsed });
  },
  setRightSidebarCollapsed: (collapsed) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(LS_RIGHT, collapsed ? 'collapsed' : 'expanded');
    set({ rightSidebarCollapsed: collapsed });
  },
  toggleLeftSidebar: () => get().setLeftSidebarCollapsed(!get().leftSidebarCollapsed),
  toggleRightSidebar: () => get().setRightSidebarCollapsed(!get().rightSidebarCollapsed),
}));
