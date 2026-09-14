"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Shrink monospace diagrams so the full figure stays in the content column. */
export function NotionCode({ children }: { children: ReactNode }) {
  const fitRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const fitEl = fitRef.current;
    const pre = preRef.current;
    if (!fitEl || !pre) return;

    const fit = () => {
      pre.style.removeProperty("zoom");
      const available = fitEl.clientWidth;
      const needed = pre.scrollWidth;
      const scale = needed > 0 ? Math.min(1, available / needed) : 1;
      pre.style.zoom = String(scale);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(fitEl);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div className="notion-code-wrap">
      <div className="notion-code-fit" ref={fitRef}>
        <pre className="notion-code" ref={preRef}>
          <code>{children}</code>
        </pre>
      </div>
    </div>
  );
}
