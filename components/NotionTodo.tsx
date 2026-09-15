import type { ReactNode } from "react";

export function NotionTodo({
  blockId,
  defaultChecked,
  children,
}: {
  blockId: string;
  defaultChecked: boolean;
  children: ReactNode;
}) {
  return (
    <label className="notion-todo" data-todo-id={blockId || undefined}>
      <input type="checkbox" defaultChecked={defaultChecked} />
      <span>{children}</span>
    </label>
  );
}
