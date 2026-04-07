import { useMemo } from "react";
import { useDiffStore } from "../stores/diffStore";
import { useFilterStore } from "../stores/filterStore";
import { applyFilters } from "../lib/diffFilter";
import type { FilteredDiffSet } from "../types/filter";

export function useFilteredDiff(): FilteredDiffSet | null {
  const diffSet = useDiffStore((s) => s.diffSet);
  const filters = useFilterStore((s) => s.filters);

  return useMemo(() => {
    if (!diffSet) return null;
    return applyFilters(diffSet, filters);
  }, [diffSet, filters]);
}
