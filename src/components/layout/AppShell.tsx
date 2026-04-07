import type { ReactNode } from "react";
import { Toolbar } from "./Toolbar";
import { StatusBar } from "./StatusBar";
import { PRInfoDisplay } from "../github/PRInfo";
import { FileList } from "../sidebar/FileList";
import { FilterPanel } from "../sidebar/FilterPanel";
import { useResizable } from "../../hooks/useResizable";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const sidebar = useResizable({ direction: "horizontal", initialSize: 320, minSize: 200, maxSize: 600 });
  const fileList = useResizable({ direction: "vertical", initialSize: 300, minSize: 80, maxSize: 800 });

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-200">
      <PRInfoDisplay />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: sidebar.size }}>
          <Toolbar />
          <div className="overflow-y-scroll visible-scrollbar" style={{ height: fileList.size }}>
            <FileList />
          </div>
          <ResizeHandle direction="vertical" onMouseDown={fileList.onMouseDown} />
          <div className="flex-1 overflow-hidden">
            <FilterPanel />
          </div>
        </div>

        <ResizeHandle direction="horizontal" onMouseDown={sidebar.onMouseDown} />

        {/* Main content */}
        <div className="flex-1 overflow-y-scroll visible-scrollbar" data-diff-scroll-container>
          {children}
        </div>
      </div>
      <StatusBar />
    </div>
  );
}

function ResizeHandle({ direction, onMouseDown }: { direction: "horizontal" | "vertical"; onMouseDown: (e: React.MouseEvent) => void }) {
  if (direction === "horizontal") {
    return (
      <div
        onMouseDown={onMouseDown}
        className="w-1 flex-shrink-0 bg-gray-700 hover:bg-blue-500 cursor-col-resize transition-colors"
      />
    );
  }
  return (
    <div
      onMouseDown={onMouseDown}
      className="h-1 flex-shrink-0 bg-gray-700 hover:bg-blue-500 cursor-row-resize transition-colors"
    />
  );
}
