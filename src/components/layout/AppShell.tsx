import type { ReactNode } from "react";
import { Toolbar } from "./Toolbar";
import { StatusBar } from "./StatusBar";
import { PRInfoDisplay } from "../github/PRInfo";
import { FileList } from "../sidebar/FileList";
import { FilterPanel } from "../sidebar/FilterPanel";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-200">
      <PRInfoDisplay />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 border-r border-gray-700 flex flex-col overflow-hidden">
          <Toolbar />
          <FileList />
          <FilterPanel />
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-scroll visible-scrollbar" data-diff-scroll-container>
          {children}
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
