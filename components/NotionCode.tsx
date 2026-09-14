"use client";

import { useEffect, useRef, type ReactNode } from "react";

const BASE_FONT_PX = 13;
const EMOJI_RE =
  /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/u;

function renderMonospaceText(text: string): ReactNode {
  const parts = text.split(EMOJI_RE);
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <span className="notion-code-emoji" key={index}>
        {part}
      </span>
    ) : (
      part
    )
  );
}

/** Fit CJK/emoji ASCII diagrams inside the content column without clipping. */
export function NotionCode({ text }: { text: string }) {
  const fitRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const fitEl = fitRef.current;
    const pre = preRef.current;
    if (!fitEl || !pre) return;

    const fit = () => {
      pre.style.fontSize = `${BASE_FONT_PX}px`;
      const available = fitEl.clientWidth;
      const needed = pre.scrollWidth;
      const scale = needed > 0 ? Math.min(1, available / needed) : 1;
      pre.style.fontSize = `${BASE_FONT_PX * scale}px`;
    };

    const run = () => {
      if (typeof document !== "undefined" && document.fonts?.ready) {
        void document.fonts.ready.then(fit);
      } else {
        fit();
      }
    };

    run();
    const observer = new ResizeObserver(run);
    observer.observe(fitEl);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div className="notion-code-wrap">
      <div className="notion-code-fit" ref={fitRef}>
        <pre className="notion-code" ref={preRef}>
          <code>{renderMonospaceText(text)}</code>
        </pre>
      </div>
    </div>
  );
}
