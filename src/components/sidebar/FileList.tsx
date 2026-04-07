import { useState, useMemo } from "react";
import { useFilteredDiff } from "../../hooks/useFilteredDiff";
import type { DiffFile, FileStatus } from "../../types/diff";
import type { FilteredDiffFile } from "../../types/filter";

function statusLabel(status: FileStatus): string {
  switch (status.type) {
    case "added": return "A";
    case "deleted": return "D";
    case "modified": return "M";
    case "renamed": return "R";
  }
}

function statusColor(status: FileStatus): string {
  switch (status.type) {
    case "added": return "text-green-400";
    case "deleted": return "text-red-400";
    case "modified": return "text-yellow-400";
    case "renamed": return "text-blue-400";
  }
}

function displayPath(file: DiffFile): string {
  if (file.status.type === "renamed" && file.old_path && file.new_path) {
    return `${file.old_path} → ${file.new_path}`;
  }
  return file.new_path ?? file.old_path ?? "unknown";
}

function fileName(file: DiffFile): string {
  const path = file.new_path ?? file.old_path ?? "unknown";
  return path.split("/").pop() ?? path;
}

function scrollToFile(fileIndex: number) {
  const el = document.querySelector(`[data-file-index="${fileIndex}"]`);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

type ViewMode = "flat" | "tree";

interface VisibleFile {
  filteredFile: FilteredDiffFile;
  originalIndex: number;
}

export function FileList() {
  const filtered = useFilteredDiff();
  const [viewMode, setViewMode] = useState<ViewMode>("flat");

  const visibleFiles = useMemo(() => {
    if (!filtered) return [];
    const result: VisibleFile[] = [];
    for (let i = 0; i < filtered.files.length; i++) {
      if (filtered.files[i].visible_change_count > 0) {
        result.push({ filteredFile: filtered.files[i], originalIndex: i });
      }
    }
    return result;
  }, [filtered]);

  if (!filtered) return null;

  return (
    <div>
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          Files ({visibleFiles.length}
          {visibleFiles.length < filtered.files.length && (
            <span> of {filtered.files.length}</span>
          )})
        </span>
        <button
          onClick={() => setViewMode(viewMode === "flat" ? "tree" : "flat")}
          className="text-xs text-gray-500 hover:text-gray-300"
          title={viewMode === "flat" ? "Switch to tree view" : "Switch to flat list"}
        >
          {viewMode === "flat" ? "🗂" : "☰"}
        </button>
      </div>
      {viewMode === "flat" ? (
        <FlatFileList visibleFiles={visibleFiles} />
      ) : (
        <TreeFileList visibleFiles={visibleFiles} />
      )}
    </div>
  );
}

function FlatFileList({ visibleFiles }: { visibleFiles: VisibleFile[] }) {
  return (
    <ul>
      {visibleFiles.map(({ filteredFile, originalIndex }) => (
        <li key={originalIndex}>
          <FileItem filteredFile={filteredFile} originalIndex={originalIndex} label={displayPath(filteredFile.file)} />
        </li>
      ))}
    </ul>
  );
}

function FileItem({ filteredFile, originalIndex, label }: { filteredFile: FilteredDiffFile; originalIndex: number; label: string }) {
  return (
    <button
      onClick={() => scrollToFile(originalIndex)}
      className="w-full text-left px-3 py-1 text-sm flex items-center gap-2 hover:bg-gray-800 border-l-2 border-transparent"
      title={displayPath(filteredFile.file)}
    >
      <span className={`font-mono text-xs w-4 flex-shrink-0 ${statusColor(filteredFile.file.status)}`}>
        {statusLabel(filteredFile.file.status)}
      </span>
      <span className="truncate text-gray-300">
        {label}
      </span>
      <span className="ml-auto flex-shrink-0 text-xs text-gray-500">
        <span className="text-green-400/70">+{filteredFile.visible_additions}</span>{" "}
        <span className="text-red-400/70">-{filteredFile.visible_deletions}</span>
      </span>
    </button>
  );
}

// --- Tree View ---

interface TreeNode {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  files: VisibleFile[];
}

function buildTree(visibleFiles: VisibleFile[]): TreeNode {
  const root: TreeNode = { name: "", path: "", children: new Map(), files: [] };

  for (const vf of visibleFiles) {
    const path = vf.filteredFile.file.new_path ?? vf.filteredFile.file.old_path ?? "unknown";
    const parts = path.split("/");
    let current = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current.children.has(part)) {
        const childPath = parts.slice(0, i + 1).join("/");
        current.children.set(part, { name: part, path: childPath, children: new Map(), files: [] });
      }
      current = current.children.get(part)!;
    }

    current.files.push(vf);
  }

  return collapseTree(root);
}

/** Collapse single-child directories: a/b/c with no files → "a/b/c" */
function collapseTree(node: TreeNode): TreeNode {
  // Recursively collapse children first
  const newChildren = new Map<string, TreeNode>();
  for (const [key, child] of node.children) {
    newChildren.set(key, collapseTree(child));
  }
  node.children = newChildren;

  // If this node has exactly one child directory and no files, merge them
  if (node.children.size === 1 && node.files.length === 0) {
    const [, child] = [...node.children.entries()][0];
    // Don't collapse root
    if (node.name !== "") {
      return {
        name: `${node.name}/${child.name}`,
        path: child.path,
        children: child.children,
        files: child.files,
      };
    }
  }

  return node;
}

function countTreeFiles(node: TreeNode): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const vf of node.files) {
    additions += vf.filteredFile.visible_additions;
    deletions += vf.filteredFile.visible_deletions;
  }
  for (const child of node.children.values()) {
    const sub = countTreeFiles(child);
    additions += sub.additions;
    deletions += sub.deletions;
  }
  return { additions, deletions };
}

function TreeFileList({ visibleFiles }: { visibleFiles: VisibleFile[] }) {
  const tree = useMemo(() => buildTree(visibleFiles), [visibleFiles]);

  return (
    <ul>
      {[...tree.children.values()].map((child) => (
        <TreeNodeComponent key={child.path} node={child} depth={0} />
      ))}
      {tree.files.map((vf) => (
        <li key={vf.originalIndex}>
          <FileItem filteredFile={vf.filteredFile} originalIndex={vf.originalIndex} label={fileName(vf.filteredFile.file)} />
        </li>
      ))}
    </ul>
  );
}

function TreeNodeComponent({ node, depth }: { node: TreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const stats = useMemo(() => countTreeFiles(node), [node]);

  return (
    <li>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left py-1 text-sm flex items-center gap-1.5 hover:bg-gray-800"
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
      >
        <span className="text-gray-500 text-xs w-4 flex-shrink-0">
          {expanded ? "▼" : "▶"}
        </span>
        <span className="truncate text-gray-400">{node.name}</span>
        <span className="ml-auto flex-shrink-0 text-xs text-gray-600 pr-3">
          <span className="text-green-400/50">+{stats.additions}</span>{" "}
          <span className="text-red-400/50">-{stats.deletions}</span>
        </span>
      </button>
      {expanded && (
        <ul>
          {[...node.children.values()].map((child) => (
            <TreeNodeComponent key={child.path} node={child} depth={depth + 1} />
          ))}
          {node.files.map((vf) => (
            <li key={vf.originalIndex} style={{ paddingLeft: `${(depth + 1) * 12}px` }}>
              <FileItem filteredFile={vf.filteredFile} originalIndex={vf.originalIndex} label={fileName(vf.filteredFile.file)} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
