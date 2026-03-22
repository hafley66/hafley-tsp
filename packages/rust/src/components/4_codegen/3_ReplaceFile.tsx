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
      <SourceFile path={props.path} externalUses={props.externalUses}>
        {buildInitialContent(zones, manualContent)}
      </SourceFile>
    );
  }

  return (
    <SourceFile path={props.path} externalUses={props.externalUses}>
      {spliceZones(existingContent, zones)}
    </SourceFile>
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
  const zoneMap: Record<string, Children> = {};
  for (const z of zones) {
    zoneMap[z.id] = z.content;
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

  const pairs: Record<string, { startLineEnd: number; endLineStart: number; endLineEnd: number }> = {};

  for (const s of sigils) {
    if (!pairs[s.regionId]) {
      pairs[s.regionId] = { startLineEnd: 0, endLineStart: 0, endLineEnd: 0 };
    }
    if (s.type === "start") {
      const afterLine = s.lineEnd;
      const nextChar = fileContent[afterLine];
      pairs[s.regionId].startLineEnd = nextChar === "\n" ? afterLine + 1 : afterLine;
    } else {
      pairs[s.regionId].endLineStart = s.lineStart;
      pairs[s.regionId].endLineEnd = s.lineEnd;
    }
  }

  const regionIds = Object.keys(pairs)
    .filter((id) => id in zoneMap && pairs[id].startLineEnd > 0 && pairs[id].endLineStart > 0)
    .sort((a, b) => pairs[a].startLineEnd - pairs[b].startLineEnd);

  if (regionIds.length === 0) {
    return [fileContent];
  }

  const result: Children[] = [];
  let cursor = 0;

  for (const id of regionIds) {
    const pair = pairs[id];

    if (pair.startLineEnd > cursor) {
      result.push(fileContent.substring(cursor, pair.startLineEnd));
    }

    result.push(zoneMap[id]);
    result.push("\n");

    result.push(fileContent.substring(pair.endLineStart, pair.endLineEnd));
    cursor = pair.endLineEnd;
  }

  if (cursor < fileContent.length) {
    result.push(fileContent.substring(cursor));
  }

  return result;
}
