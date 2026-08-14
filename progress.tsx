import { cx } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  colorClass = "bg-brand-600",
}: {
  value: number;
  className?: string;
  colorClass?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full bg-ink-100", className)}>
      <div className={cx("h-full rounded-full transition-all", colorClass)} style={{ width: `${pct}%` }} />
    </div>
  );
}
