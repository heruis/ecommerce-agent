"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/components/ui";

/**
 * Renders a fixed-size design (e.g. a 1400×820 demo scene) scaled down to fit
 * its container, like a responsive picture made of real HTML. The box reserves
 * its final height from the aspect ratio before measuring, so nothing shifts.
 * The scaled content is decorative (aria-hidden); pass a text description via
 * `label` for screen readers. Owner: WS3.
 */
export function ScaledFrame({
  width,
  height,
  label,
  children,
  className,
}: {
  width: number;
  height: number;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // ResizeObserver fires once on observe, so this also sets the first scale.
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setScale(Math.min(1, entry.contentRect.width / width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  const s = scale ?? 1;
  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className={cn("relative w-full overflow-hidden", className)}
      style={scale === null ? { aspectRatio: `${width} / ${height}` } : { height: height * s }}
    >
      <div
        aria-hidden
        className={cn(
          "absolute left-0 top-0 origin-top-left transition-opacity duration-200",
          scale === null ? "opacity-0" : "opacity-100",
        )}
        style={{ width, height, transform: `scale(${s})` }}
      >
        {children}
      </div>
    </div>
  );
}
