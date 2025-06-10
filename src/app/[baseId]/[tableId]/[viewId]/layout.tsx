"use client";

import { type FC, type ReactNode, useState } from "react";
import { SidebarContext } from "../SidebarContext";

const TableLayout: FC<{ children: ReactNode }> = ({ children }) => {
  const [sideBarOpen, setSidebarOpen] = useState(true);

  return (
    <SidebarContext.Provider value={{ sideBarOpen, setSidebarOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

export default TableLayout;