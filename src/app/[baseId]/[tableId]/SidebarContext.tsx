"use client";

import { createContext, type Dispatch, type SetStateAction } from "react";

export interface SidebarContextValue {
  sideBarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
}

export const SidebarContext = createContext<SidebarContextValue>({
  sideBarOpen: false,
  setSidebarOpen: () =>
    console.warn("setSidebarOpen called without a provider"),
});
