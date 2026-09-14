import type { CSSProperties } from "react";

type TreeNode = { lines: string[] };
type TreeDiagram = {
  root: TreeNode & { note?: string };
  children: TreeNode[];
};

function extractPipeCells(line: string): { cells: string[]; trailing: string } | null {
  const matches = [...line.matchAll(/│([^│]*)│/g)];
  if (!matches.length) return null;
  const raw = matches.map((m) => m[1]);
  const cells =
    raw.length >= 3 && raw.length % 2 === 1
      ? raw.filter((_, index) => index % 2 === 0)
      : raw;
  const last = matches[matches.length - 1];
  const trailing = line.slice((last.index || 0) + last[0].length).trim();
  return { cells, trailing };
}

function parseAsciiTree(text: string): TreeDiagram | null {
  if (!/[┌┐└┘┬┼▼]/.test(text)) return null;

  const rows: { cells: string[]; trailing?: string }[] = [];
  for (const line of text.split("\n")) {
    const parsed = extractPipeCells(line);
    if (!parsed) continue;
    const cells = parsed.cells.map((cell) => cell.trim());
    if (cells.every((cell) => !cell) && cells.length < 2) continue;
    rows.push({
      cells,
      trailing: parsed.trailing || undefined,
    });
  }
  if (rows.length < 2) return null;

  const groups: { cells: string[][]; trailing?: string }[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.cells.length === row.cells.length) {
      row.cells.forEach((cell, index) => last.cells[index].push(cell));
      if (row.trailing && !last.trailing) last.trailing = row.trailing;
    } else {
      groups.push({
        cells: row.cells.map((cell) => [cell]),
        trailing: row.trailing,
      });
    }
  }

  const rootGroup = groups.find((group) => group.cells.length === 1);
  const childGroup = [...groups].reverse().find((group) => group.cells.length >= 2);
  if (!rootGroup || !childGroup) return null;

  const clean = (lines: string[]) => lines.map((line) => line.trim()).filter(Boolean);

  return {
    root: { lines: clean(rootGroup.cells[0]), note: rootGroup.trailing },
    children: childGroup.cells.map((lines) => ({ lines: clean(lines) })),
  };
}

function TreeBox({ lines }: { lines: string[] }) {
  return (
    <div className="notion-tree-box">
      {lines.map((line, index) => (
        <div key={index}>{line}</div>
      ))}
    </div>
  );
}

function NotionTreeDiagram({ tree }: { tree: TreeDiagram }) {
  return (
    <div className="notion-tree">
      <div className="notion-tree-root-row">
        <TreeBox lines={tree.root.lines} />
        {tree.root.note ? <span className="notion-tree-note">{tree.root.note}</span> : null}
      </div>
      <div className="notion-tree-stem" aria-hidden="true" />
      <div
        className="notion-tree-children"
        style={
          {
            gridTemplateColumns: `repeat(${tree.children.length}, minmax(0, 1fr))`,
            ["--tree-cols"]: String(tree.children.length),
          } as CSSProperties
        }
      >
        {tree.children.map((child, index) => (
          <div className="notion-tree-col" key={index}>
            <span className="notion-tree-arrow" aria-hidden="true">
              ▼
            </span>
            <TreeBox lines={child.lines} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Render a Notion code block; box-drawing diagrams become a CSS tree. */
export function NotionCode({ text }: { text: string }) {
  const tree = parseAsciiTree(text);
  if (tree) return <NotionTreeDiagram tree={tree} />;
  return (
    <div className="notion-code-wrap">
      <pre className="notion-code">
        <code>{text}</code>
      </pre>
    </div>
  );
}
