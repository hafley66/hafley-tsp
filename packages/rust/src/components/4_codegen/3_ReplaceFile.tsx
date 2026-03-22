import { readFileSync } from "fs";
import { isComponentCreator, childrenArray, type Children } from "@alloy-js/core";
import { SourceFile } from "../3_files/0_SourceFile.js";

const SIGIL_REGEX = /^(\s*)(.*alloy-(.+)-(start|end).*)$/gm;

export interface AutoZoneProps {
  id: string;
  /** Comment style for sigils. Default: "//" */
  sigil?: string;
  children?: Children;
}

/**
 * Marker component for ReplaceFile. Holds the region id and JSX children
 * that replace content between the corresponding sigil pair.
 */
export function AutoZone(_props: AutoZoneProps) {}

export interface ManualZoneProps {
  children?: Children;
}

/**
 * Marker component for ReplaceFile. Content here is only rendered on
 * first emit (file doesn't exist). On subsequent emits, everything
 * outside AutoZone sigils is preserved from disk.
 */
export function ManualZone(_props: ManualZoneProps) {}

export interface ReplaceFileProps {
  path: string;
  /** Absolute path to existing file on disk (for re-emit). If not set or file missing, first-emit mode. */
  existingFile?: string;
  externalUses?: string[];
  children?: Children;
}

/**
 * Rust-scoped replace-region file.
 * Wraps output in Rust SourceFile (RustSourceFileScope) so all Rust
 * declaration components get the scope they need.
 *
 * First emit (no existing file): builds full template from AutoZone + ManualZone.
 * Re-emit (existing file): replaces auto zones, preserves everything else.
 */
export function ReplaceFile(props: ReplaceFileProps): Children {
  const children = childrenArray(() => props.children);
  const zones: { id: string; sigil: string; content: Children }[] = [];
  let manualContent: Children | undefined;
  const passthrough: Children[] = [];

  for (const child of children) {
    if (isComponentCreator(child, AutoZone)) {
      const zoneProps = child.props as AutoZoneProps;
      zones.push({
        id: zoneProps.id,
        sigil: zoneProps.sigil ?? "//",
        content: zoneProps.children,
      });
    } else if (isComponentCreator(child, ManualZone)) {
      manualContent = (child.props as ManualZoneProps).children;
    } else {
      passthrough.push(child);
    }
  }

  let existingContent: string | null = null;
  if (props.existingFile) {
    try {
      existingContent = readFileSync(props.existingFile, "utf-8");
    } catch {
      // File doesn't exist yet -- first emit
    }
  }

  if (existingContent === null) {
    return (
      <>
        <SourceFile path={props.path} externalUses={props.externalUses}>
          {buildInitialContent(zones, manualContent)}
        </SourceFile>
        {passthrough}
      </>
    );
  }

  return (
    <>
      <SourceFile path={props.path} externalUses={props.externalUses}>
        {spliceZones(existingContent, zones)}
      </SourceFile>
      {passthrough}
    </>
  );
}

function buildInitialContent(
  zones: { id: string; sigil: string; content: Children }[],
  manualContent: Children | undefined,
): Children[] {
  const result: Children[] = [];

  for (const z of zones) {
    result.push(`${z.sigil} alloy-${z.id}-start\n`);
    result.push(z.content);
    result.push(`\n${z.sigil} alloy-${z.id}-end\n`);
  }

  if (manualContent !== undefined) {
    result.push("\n");
    result.push(manualContent);
  }

  return result;
}

interface SigilMatch {
  regionId: string;
  type: "start" | "end";
  lineStart: number;
  lineEnd: number;
}

function spliceZones(
  fileContent: string,
  zones: { id: string; sigil: string; content: Children }[],
): Children[] {
  const zoneMap: Record<string, { content: Children; sigil: string }> = {};
  for (const z of zones) {
    zoneMap[z.id] = { content: z.content, sigil: z.sigil };
  }

  const sigils: SigilMatch[] = [];
  SIGIL_REGEX.lastIndex = 0;
  let match;

  while ((match = SIGIL_REGEX.exec(fileContent)) !== null) {
    sigils.push({
      regionId: match[3],
      type: match[4] as "start" | "end",
      lineStart: match.index!,
      lineEnd: match.index! + match[0].length,
    });
  }

  const pairs: Record<string, { startOffset: number; startLineEnd: number; endLineStart: number; endLineEnd: number }> = {};

  for (const s of sigils) {
    if (!pairs[s.regionId]) {
      pairs[s.regionId] = { startOffset: 0, startLineEnd: 0, endLineStart: 0, endLineEnd: 0 };
    }
    if (s.type === "start") {
      pairs[s.regionId].startOffset = s.lineStart;
      const afterLine = s.lineEnd;
      const nextChar = fileContent[afterLine];
      pairs[s.regionId].startLineEnd = nextChar === "\n" ? afterLine + 1 : afterLine;
    } else {
      pairs[s.regionId].endLineStart = s.lineStart;
      const afterLine = s.lineEnd;
      const nextChar = fileContent[afterLine];
      pairs[s.regionId].endLineEnd = nextChar === "\n" ? afterLine + 1 : afterLine;
    }
  }

  // Matched zones: on disk AND in current zone map -- replace content
  const matchedIds = Object.keys(pairs)
    .filter((id) => id in zoneMap && pairs[id].startLineEnd > 0 && pairs[id].endLineStart > 0)
    .sort((a, b) => pairs[a].startLineEnd - pairs[b].startLineEnd);

  // Orphaned zones: on disk but NOT in current zone map -- strip entirely
  const orphanedIds = Object.keys(pairs)
    .filter((id) => !(id in zoneMap) && pairs[id].startOffset >= 0 && pairs[id].endLineEnd > 0)
    .sort((a, b) => pairs[a].startOffset - pairs[b].startOffset);

  // New zones: in zone map but NOT on disk -- append after last matched zone
  const newZones = zones.filter((z) => !(z.id in pairs));

  // Build set of all zone ids to process (matched + orphaned), sorted by position
  const allDiskIds = [...matchedIds, ...orphanedIds].sort(
    (a, b) => pairs[a].startOffset - pairs[b].startOffset,
  );

  const result: Children[] = [];
  let cursor = 0;

  for (const id of allDiskIds) {
    const pair = pairs[id];
    const isOrphaned = !zoneMap[id];

    // Content before this zone's start sigil
    if (pair.startOffset > cursor) {
      result.push(fileContent.substring(cursor, pair.startOffset));
    }

    if (isOrphaned) {
      // Skip the entire orphaned zone (start sigil through end sigil + newline)
      cursor = pair.endLineEnd;
    } else {
      // Preserve start sigil line
      result.push(fileContent.substring(pair.startOffset, pair.startLineEnd));
      // Replace content
      result.push(zoneMap[id].content);
      result.push("\n");
      // Preserve end sigil line
      result.push(fileContent.substring(pair.endLineStart, pair.endLineEnd));
      cursor = pair.endLineEnd;
    }
  }

  // Append new zones (not on disk yet) before remaining manual content
  if (newZones.length > 0) {
    // Insert a newline separator if we have prior content
    if (result.length > 0) {
      result.push("\n");
    }
    for (const z of newZones) {
      result.push(`${z.sigil} alloy-${z.id}-start\n`);
      result.push(z.content);
      result.push(`\n${z.sigil} alloy-${z.id}-end\n`);
    }
  }

  // Remaining file content (manual zone / trailing content)
  if (cursor < fileContent.length) {
    result.push(fileContent.substring(cursor));
  }

  return result;
}
