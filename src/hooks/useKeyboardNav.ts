import { useEffect } from "react";
import { useNavigationStore } from "../stores/navigationStore";
import { scrollToSibling } from "../components/diff/DiffNavToolbar";

export function useKeyboardNav() {
  const setViewMode = useNavigationStore((s) => s.setViewMode);
  const viewMode = useNavigationStore((s) => s.viewMode);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (e.key === "ArrowDown" && e.shiftKey && e.metaKey) {
        e.preventDefault();
        scrollToSibling("data-file-index", "next");
      } else if (e.key === "ArrowUp" && e.shiftKey && e.metaKey) {
        e.preventDefault();
        scrollToSibling("data-file-index", "prev");
      } else if (e.key === "ArrowDown" && e.shiftKey) {
        e.preventDefault();
        scrollToSibling("data-hunk-id", "next");
      } else if (e.key === "ArrowUp" && e.shiftKey) {
        e.preventDefault();
        scrollToSibling("data-hunk-id", "prev");
      } else if (e.key === "t") {
        e.preventDefault();
        setViewMode(viewMode === "unified" ? "side-by-side" : "unified");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setViewMode, viewMode]);
}
