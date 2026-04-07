import type { DiffSet, DiffFile, DiffHunk, DiffLine, DiffLineKind, DiffSource, FileStatus } from "../types/diff";

/**
 * Parse unified diff text (as returned by `git diff` or GitHub's diff endpoint)
 * into a structured DiffSet.
 */
export function parseUnifiedDiff(diffText: string, source: DiffSource): DiffSet {
  const lines = diffText.split("\n");
  const files: DiffFile[] = [];
  let i = 0;

  while (i < lines.length) {
    // Look for start of a file diff
    if (lines[i].startsWith("diff --git ")) {
      const result = parseFileDiff(lines, i, files.length);
      files.push(result.file);
      i = result.nextIndex;
    } else {
      i++;
    }
  }

  let totalAdditions = 0;
  let totalDeletions = 0;
  for (const file of files) {
    totalAdditions += file.stats.additions;
    totalDeletions += file.stats.deletions;
  }

  return {
    source,
    files,
    stats: {
      files_changed: files.length,
      total_additions: totalAdditions,
      total_deletions: totalDeletions,
    },
  };
}

interface FileParseResult {
  file: DiffFile;
  nextIndex: number;
}

function parseFileDiff(lines: string[], startIndex: number, fileIndex: number): FileParseResult {
  let i = startIndex;

  // Parse "diff --git a/path b/path"
  const diffLine = lines[i];
  const gitPaths = parseGitDiffLine(diffLine);
  i++;

  let oldPath: string | null = gitPaths.a;
  let newPath: string | null = gitPaths.b;
  let status: FileStatus = { type: "modified" };
  let isBinary = false;

  // Parse optional header lines (index, old mode, new mode, similarity, etc.)
  while (i < lines.length && !lines[i].startsWith("diff --git ")) {
    const line = lines[i];

    if (line.startsWith("new file mode")) {
      status = { type: "added" };
      oldPath = null;
      i++;
    } else if (line.startsWith("deleted file mode")) {
      status = { type: "deleted" };
      newPath = null;
      i++;
    } else if (line.startsWith("similarity index")) {
      const match = line.match(/similarity index (\d+)%/);
      status = { type: "renamed", similarity: match ? parseInt(match[1]) : 100 };
      i++;
    } else if (line.startsWith("rename from")) {
      oldPath = line.slice("rename from ".length);
      i++;
    } else if (line.startsWith("rename to")) {
      newPath = line.slice("rename to ".length);
      i++;
    } else if (line.startsWith("Binary files")) {
      isBinary = true;
      i++;
    } else if (line.startsWith("index ") || line.startsWith("old mode") || line.startsWith("new mode") || line.startsWith("copy from") || line.startsWith("copy to") || line.startsWith("dissimilarity index")) {
      i++;
    } else if (line.startsWith("--- ")) {
      // Start of actual diff content - parse --- and +++ lines
      const oldPathLine = line.slice(4);
      oldPath = oldPathLine === "/dev/null" ? null : stripPrefix(oldPathLine, "a/");
      i++;

      if (i < lines.length && lines[i].startsWith("+++ ")) {
        const newPathLine = lines[i].slice(4);
        newPath = newPathLine === "/dev/null" ? null : stripPrefix(newPathLine, "b/");
        i++;
      }

      // Now parse hunks
      break;
    } else {
      // Unknown header line, skip
      i++;
    }
  }

  // Parse hunks
  const hunks: DiffHunk[] = [];
  let additions = 0;
  let deletions = 0;

  while (i < lines.length && !lines[i].startsWith("diff --git ")) {
    if (lines[i].startsWith("@@")) {
      const result = parseHunk(lines, i, fileIndex, hunks.length);
      hunks.push(result.hunk);
      additions += result.additions;
      deletions += result.deletions;
      i = result.nextIndex;
    } else {
      i++;
    }
  }

  return {
    file: {
      old_path: oldPath,
      new_path: newPath,
      status,
      hunks,
      is_binary: isBinary,
      stats: { additions, deletions },
    },
    nextIndex: i,
  };
}

interface HunkParseResult {
  hunk: DiffHunk;
  nextIndex: number;
  additions: number;
  deletions: number;
}

function parseHunk(lines: string[], startIndex: number, fileIndex: number, hunkIndex: number): HunkParseResult {
  const header = lines[startIndex];
  const hunkId = `${fileIndex}_${hunkIndex}`;

  // Parse "@@ -old_start,old_count +new_start,new_count @@ section_header"
  const match = header.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
  if (!match) {
    // Malformed hunk header, skip
    return {
      hunk: {
        id: hunkId,
        header,
        old_start: 0,
        old_count: 0,
        new_start: 0,
        new_count: 0,
        section_header: null,
        lines: [],
      },
      nextIndex: startIndex + 1,
      additions: 0,
      deletions: 0,
    };
  }

  const oldStart = parseInt(match[1]);
  const oldCount = match[2] !== undefined ? parseInt(match[2]) : 1;
  const newStart = parseInt(match[3]);
  const newCount = match[4] !== undefined ? parseInt(match[4]) : 1;
  const sectionHeader = match[5].trim() || null;

  let i = startIndex + 1;
  const hunkLines: DiffLine[] = [];
  let oldLine = oldStart;
  let newLine = newStart;
  let additions = 0;
  let deletions = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Stop at next hunk, next file, or end
    if (line.startsWith("diff --git ") || line.startsWith("@@")) {
      break;
    }

    const lineIndex = hunkLines.length;
    const lineId = `${hunkId}_${lineIndex}`;

    if (line.startsWith("+")) {
      hunkLines.push({
        id: lineId,
        kind: "addition",
        content: line.slice(1),
        old_line_number: null,
        new_line_number: newLine,
      });
      newLine++;
      additions++;
      i++;
    } else if (line.startsWith("-")) {
      hunkLines.push({
        id: lineId,
        kind: "deletion",
        content: line.slice(1),
        old_line_number: oldLine,
        new_line_number: null,
      });
      oldLine++;
      deletions++;
      i++;
    } else if (line.startsWith(" ") || line === "") {
      // Context line (line starting with space, or empty line at end of hunk)
      hunkLines.push({
        id: lineId,
        kind: "context",
        content: line.startsWith(" ") ? line.slice(1) : line,
        old_line_number: oldLine,
        new_line_number: newLine,
      });
      oldLine++;
      newLine++;
      i++;
    } else if (line.startsWith("\\ No newline at end of file")) {
      // Skip this marker
      i++;
    } else {
      // Unknown line format, stop parsing this hunk
      break;
    }
  }

  return {
    hunk: {
      id: hunkId,
      header,
      old_start: oldStart,
      old_count: oldCount,
      new_start: newStart,
      new_count: newCount,
      section_header: sectionHeader,
      lines: hunkLines,
    },
    nextIndex: i,
    additions,
    deletions,
  };
}

/**
 * Parse "diff --git a/path b/path" to extract the two paths.
 * Handles paths with spaces by splitting on " b/" from the right.
 */
function parseGitDiffLine(line: string): { a: string; b: string } {
  const prefix = "diff --git ";
  const rest = line.slice(prefix.length);

  // Find " b/" - scan from right to handle paths with spaces
  const bIndex = rest.lastIndexOf(" b/");
  if (bIndex === -1) {
    // Fallback: no "b/" prefix (shouldn't happen in normal git diff)
    const parts = rest.split(" ");
    return {
      a: stripPrefix(parts[0], "a/"),
      b: stripPrefix(parts[parts.length - 1], "b/"),
    };
  }

  const aPath = rest.slice(0, bIndex);
  const bPath = rest.slice(bIndex + 1);

  return {
    a: stripPrefix(aPath, "a/"),
    b: stripPrefix(bPath, "b/"),
  };
}

function stripPrefix(path: string, prefix: string): string {
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}
