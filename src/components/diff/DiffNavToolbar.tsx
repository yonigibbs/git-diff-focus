import { useNavigationStore } from "../../stores/navigationStore";

export function DiffNavToolbar() {
  const viewMode = useNavigationStore((s) => s.viewMode);
  const setViewMode = useNavigationStore((s) => s.setViewMode);

  return (
    <div data-nav-toolbar className="flex items-center gap-1 px-4 py-1.5 border-b border-gray-700 bg-gray-900 sticky top-0 z-20">
      <NavGroup label="File">
        <NavButton onClick={() => scrollToSibling("data-file-index", "prev")} title="Previous file (Cmd+Shift+Up)" label="&#9650;" />
        <NavButton onClick={() => scrollToSibling("data-file-index", "next")} title="Next file (Cmd+Shift+Down)" label="&#9660;" />
      </NavGroup>

      <Separator />

      <NavGroup label="Change">
        <NavButton onClick={() => scrollToSibling("data-hunk-id", "prev")} title="Previous change (Shift+Up)" label="&#9650;" />
        <NavButton onClick={() => scrollToSibling("data-hunk-id", "next")} title="Next change (Shift+Down)" label="&#9660;" />
      </NavGroup>

      <Separator />

      <div className="flex text-xs border border-gray-700 rounded overflow-hidden" title="Toggle view mode (t)">
        <button
          onClick={() => setViewMode("unified")}
          className={`px-2 py-0.5 ${viewMode === "unified" ? "bg-gray-700 text-gray-200" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"}`}
        >
          Unified
        </button>
        <button
          onClick={() => setViewMode("side-by-side")}
          className={`px-2 py-0.5 ${viewMode === "side-by-side" ? "bg-gray-700 text-gray-200" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"}`}
        >
          Split
        </button>
      </div>
    </div>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0.5">
      <span className="text-xs text-gray-500 mr-1">{label}</span>
      {children}
    </div>
  );
}

function NavButton({ onClick, title, label }: { onClick: () => void; title: string; label: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-6 h-6 flex items-center justify-center text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded"
    >
      {label}
    </button>
  );
}

function Separator() {
  return <div className="w-px h-4 bg-gray-700 mx-1" />;
}

/**
 * Scroll to the next/previous element in the diff scroll container
 * that has the given data attribute.
 */
function scrollToSibling(dataAttr: string, direction: "next" | "prev") {
  const container = document.querySelector("[data-diff-scroll-container]");
  if (!container) return;

  const allElements = Array.from(container.querySelectorAll(`[${dataAttr}]`));
  if (allElements.length === 0) return;

  const isFile = dataAttr === "data-file-index";
  const containerRect = container.getBoundingClientRect();

  const toolbar = container.querySelector("[data-nav-toolbar]") as HTMLElement | null;
  const toolbarHeight = toolbar ? toolbar.offsetHeight : 0;
  const visibleTop = containerRect.top + toolbarHeight;
  const visibleBottom = containerRect.bottom;

  let currentIdx: number;
  let targetIdx: number;

  if (isFile) {
    // For files (scrolled to top): find the first element at or below the visible top
    currentIdx = -1;
    for (let i = 0; i < allElements.length; i++) {
      if (allElements[i].getBoundingClientRect().top >= visibleTop - 5) {
        currentIdx = i;
        break;
      }
    }
    if (currentIdx === -1) currentIdx = allElements.length - 1;

    if (direction === "next") {
      const rect = allElements[currentIdx].getBoundingClientRect();
      targetIdx = rect.top < visibleTop + 50
        ? Math.min(currentIdx + 1, allElements.length - 1)
        : currentIdx;
    } else {
      targetIdx = Math.max(currentIdx - 1, 0);
    }
  } else {
    // For hunks (scrolled to center): find the element closest to viewport center
    const visibleCenter = visibleTop + (visibleBottom - visibleTop) / 2;
    currentIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < allElements.length; i++) {
      const rect = allElements[i].getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const dist = Math.abs(mid - visibleCenter);
      if (dist < closestDist) {
        closestDist = dist;
        currentIdx = i;
      }
    }

    targetIdx = direction === "next"
      ? Math.min(currentIdx + 1, allElements.length - 1)
      : Math.max(currentIdx - 1, 0);
  }

  const target = allElements[targetIdx] as HTMLElement;

  clearAllFlashes();

  if (isFile) {
    const targetTop = target.getBoundingClientRect().top - containerRect.top + container.scrollTop;
    container.scrollTo({ top: targetTop - toolbarHeight, behavior: "smooth" });
  } else {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Flash as soon as the target is visible in the scroll container
  flashWhenVisible(target, container, isFile ? "file" : "hunk");
}

let pendingObserver: IntersectionObserver | null = null;

function flashWhenVisible(target: HTMLElement, container: Element, kind: "file" | "hunk") {
  // Cancel any pending observer from a previous navigation
  if (pendingObserver) {
    pendingObserver.disconnect();
    pendingObserver = null;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          observer.disconnect();
          pendingObserver = null;
          flashElement(target, kind);
          return;
        }
      }
    },
    { root: container, threshold: 0.1 }
  );

  pendingObserver = observer;
  observer.observe(target);
}

const FLASH_COLOR = "rgba(59, 130, 246, 0.7)";
const FLASH_DURATION = 1200;

const flashedElements = new Set<HTMLElement>();
let flashCleanupTimeout: ReturnType<typeof setTimeout> | null = null;

function clearAllFlashes() {
  if (flashCleanupTimeout) {
    clearTimeout(flashCleanupTimeout);
    flashCleanupTimeout = null;
  }
  for (const el of flashedElements) {
    el.style.outline = "";
    el.style.outlineOffset = "";
    el.style.transition = "";
  }
  flashedElements.clear();
}

function flashElement(el: HTMLElement, kind: "file" | "hunk") {
  // For files, flash the file header. For hunks, flash the hunk wrapper itself.
  const target = kind === "file"
    ? el.firstElementChild as HTMLElement | null
    : el;
  if (!target) return;

  target.style.outline = `2px solid ${FLASH_COLOR}`;
  target.style.outlineOffset = "-2px";
  target.style.transition = `outline-color ${FLASH_DURATION}ms ease-out`;
  flashedElements.add(target);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      target.style.outlineColor = "transparent";
    });
  });

  flashCleanupTimeout = setTimeout(() => clearAllFlashes(), FLASH_DURATION + 50);
}

export { scrollToSibling };
