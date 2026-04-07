import { describe, it, expect } from "vitest";
import { pairLinesForSideBySide } from "./sideBySide";
import type { DiffLine } from "../types/diff";
import type { LineVisibility } from "../types/filter";

function makeLine(kind: "context" | "addition" | "deletion", content: string, id: string): DiffLine {
  return {
    id,
    kind,
    content,
    old_line_number: kind !== "addition" ? 1 : null,
    new_line_number: kind !== "deletion" ? 1 : null,
  };
}

const vis: LineVisibility = { visible: true, hidden_by_filter_id: null };

describe("pairLinesForSideBySide", () => {
  it("context lines appear on both sides", () => {
    const lines = [makeLine("context", "hello", "1")];
    const rows = pairLinesForSideBySide(lines, [vis]);

    expect(rows).toHaveLength(1);
    expect(rows[0].left?.line.content).toBe("hello");
    expect(rows[0].right?.line.content).toBe("hello");
  });

  it("pairs equal deletions and additions", () => {
    const lines = [
      makeLine("deletion", "old", "1"),
      makeLine("addition", "new", "2"),
    ];
    const rows = pairLinesForSideBySide(lines, [vis, vis]);

    expect(rows).toHaveLength(1);
    expect(rows[0].left?.line.content).toBe("old");
    expect(rows[0].right?.line.content).toBe("new");
  });

  it("handles more deletions than additions", () => {
    const lines = [
      makeLine("deletion", "old1", "1"),
      makeLine("deletion", "old2", "2"),
      makeLine("addition", "new1", "3"),
    ];
    const rows = pairLinesForSideBySide(lines, [vis, vis, vis]);

    expect(rows).toHaveLength(2);
    expect(rows[0].left?.line.content).toBe("old1");
    expect(rows[0].right?.line.content).toBe("new1");
    expect(rows[1].left?.line.content).toBe("old2");
    expect(rows[1].right).toBeNull();
  });

  it("handles more additions than deletions", () => {
    const lines = [
      makeLine("deletion", "old1", "1"),
      makeLine("addition", "new1", "2"),
      makeLine("addition", "new2", "3"),
    ];
    const rows = pairLinesForSideBySide(lines, [vis, vis, vis]);

    expect(rows).toHaveLength(2);
    expect(rows[0].left?.line.content).toBe("old1");
    expect(rows[0].right?.line.content).toBe("new1");
    expect(rows[1].left).toBeNull();
    expect(rows[1].right?.line.content).toBe("new2");
  });

  it("handles mixed context, deletions, additions", () => {
    const lines = [
      makeLine("context", "ctx1", "1"),
      makeLine("deletion", "old", "2"),
      makeLine("addition", "new", "3"),
      makeLine("context", "ctx2", "4"),
    ];
    const rows = pairLinesForSideBySide(lines, [vis, vis, vis, vis]);

    expect(rows).toHaveLength(3);
    expect(rows[0].left?.line.kind).toBe("context");
    expect(rows[1].left?.line.kind).toBe("deletion");
    expect(rows[1].right?.line.kind).toBe("addition");
    expect(rows[2].left?.line.kind).toBe("context");
  });

  it("handles only additions (new file)", () => {
    const lines = [
      makeLine("addition", "line1", "1"),
      makeLine("addition", "line2", "2"),
    ];
    const rows = pairLinesForSideBySide(lines, [vis, vis]);

    expect(rows).toHaveLength(2);
    expect(rows[0].left).toBeNull();
    expect(rows[0].right?.line.content).toBe("line1");
    expect(rows[1].left).toBeNull();
    expect(rows[1].right?.line.content).toBe("line2");
  });
});
