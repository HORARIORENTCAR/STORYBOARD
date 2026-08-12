import { cx } from "@/lib/utils";

export function Avatar({
  name,
  color,
  size = "md",
  className,
}: {
  name: string;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const sizes = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-12 w-12 text-base",
  };
  return (
    <div
      className={cx(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white",
        sizes[size],
        className
      )}
      style={{ backgroundColor: color ?? "#146942" }}
      title={name}
    >
      {initials}
    </div>
  );
}
