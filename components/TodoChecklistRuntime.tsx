"use client";

import { useLayoutEffect } from "react";

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

function applyStoredChecks() {
  const stored = readChecks();
  document.querySelectorAll<HTMLLabelElement>(".notion-todo[data-todo-id]").forEach((label) => {
    const id = label.dataset.todoId;
    const input = label.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!id || !input) return;
    if (typeof stored[id] === "boolean") input.checked = stored[id];
  });
}

/** Restores and persists checklist ticks even if individual todo rows do not hydrate. */
export function TodoChecklistRuntime() {
  useLayoutEffect(() => {
    applyStoredChecks();
    const onChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;
      const label = target.closest<HTMLLabelElement>(".notion-todo[data-todo-id]");
      const id = label?.dataset.todoId;
      if (!id) return;
      const stored = readChecks();
      stored[id] = target.checked;
      writeChecks(stored);
    };
    document.addEventListener("change", onChange);
    return () => document.removeEventListener("change", onChange);
  }, []);

  return null;
}
