"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Scale monospace diagrams so they stay inside the content column. */
export function NotionCode({ children }: { children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const pre = preRef.current;
    if (!wrap || !pre) return;

    const fit = () => {
      pre.style.transform = "none";
      wrap.style.height = "auto";
      const available = wrap.clientWidth;
      const needed = pre.scrollWidth;
      const scale = needed > 0 ? Math.min(1, available / needed) : 1;
      pre.style.transformOrigin = "top left";
      pre.style.transform = `scale(${scale})`;
      wrap.style.height = `${pre.scrollHeight * scale}px`;
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div className="notion-code-wrap" ref={wrapRef}>
      <pre className="notion-code" ref={preRef}>
        <code>{children}</code>
      </pre>
    </div>
  );
}
