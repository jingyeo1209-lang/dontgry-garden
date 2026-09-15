"use client";

import { useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "dontgry-todo-checks";

function readChecks(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeChecks(checks: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checks));
  } catch {
    // Private mode or quota — toggling still works for this visit.
  }
}

type Props = {
  blockId: string;
  defaultChecked: boolean;
  children: ReactNode;
};

export function NotionTodo({ blockId, defaultChecked, children }: Props) {
  const [checked, setChecked] = useState(defaultChecked);

  useEffect(() => {
    if (!blockId) return;
    const stored = readChecks()[blockId];
    if (typeof stored === "boolean") setChecked(stored);
  }, [blockId]);

  return (
    <label className="notion-todo">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          const next = event.target.checked;
          setChecked(next);
          if (!blockId) return;
          const stored = readChecks();
          stored[blockId] = next;
          writeChecks(stored);
        }}
      />
      <span>{children}</span>
    </label>
  );
}
