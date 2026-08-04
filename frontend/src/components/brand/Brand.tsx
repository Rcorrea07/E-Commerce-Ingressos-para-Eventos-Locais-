import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-400 via-violet-500 to-cyan-300 text-background shadow-[0_0_30px_rgba(139,92,246,.28)]",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" className="size-6" fill="none">
        <path d="M7 16c2.7-5.2 5.7-7.8 9-7.8s6.3 2.6 9 7.8c-2.7 5.2-5.7 7.8-9 7.8S9.7 21.2 7 16Z" stroke="currentColor" strokeWidth="2.4" />
        <circle cx="16" cy="16" r="3.2" fill="currentColor" />
        <path d="M4.5 16H1.8M30.2 16h-2.7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label="Pulso — início">
      <BrandMark />
      {!compact && (
        <span className="text-lg font-semibold tracking-[-0.04em] text-white">
          pulso<span className="text-primary">.</span>
        </span>
      )}
    </Link>
  );
}
