"use client";

import { createContext, useState, type ReactNode, type FC } from "react";

interface SidebarContextValue {
  sideBarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const SidebarContext = createContext<SidebarContextValue>({
  sideBarOpen: false,
  setSidebarOpen: (open) => {
    console.warn("setSidebarOpen called without a provider");
  }
});

const TableLayout: FC<{ children: ReactNode }> = ({ children }) => {
  const [sideBarOpen, setSidebarOpen] = useState(false);

  return (
    <SidebarContext.Provider value={{ sideBarOpen, setSidebarOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

export default TableLayout;