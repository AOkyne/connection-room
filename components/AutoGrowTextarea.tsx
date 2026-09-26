"use client";

import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

interface AutoGrowTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  // Height cap before the box starts scrolling, as a CSS length. dvh (the
  // visible screen height, excluding Safari's toolbars) so the box plus
  // its Post button still fit on a phone.
  maxHeight?: string;
}

/**
 * A textarea that grows to fit what's been written (from its `rows`
 * starting height up to `maxHeight`), instead of a fixed 2-3 lines that
 * scroll. Requested after a member on iPhone selected more of a long
 * answer than they could see in the small box and deleted it all -- the
 * whole answer needs to be visible while editing it.
 */
export function AutoGrowTextarea({ maxHeight = "60dvh", style, value, ...props }: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reset first so the box can also shrink when text is deleted.
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);

  return <textarea ref={ref} value={value} style={{ ...style, maxHeight, overflowY: "auto" }} {...props} />;
}
