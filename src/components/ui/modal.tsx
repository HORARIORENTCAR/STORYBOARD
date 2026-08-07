"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cx } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink-950/50 backdrop-blur-sm sm:items-start sm:px-4 sm:py-10">
      <div className={cx("max-h-[92vh] w-full overflow-hidden rounded-t-2xl bg-white shadow-pop sm:max-h-none sm:rounded-2xl", widths[size])}>
        <div className="flex items-start justify-between border-b border-ink-100 px-6 py-5">
          <div>
            {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
            <h2 className="text-xl font-semibold text-ink-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 text-ink-500 hover:bg-ink-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6" style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }}>{children}</div>
      </div>
    </div>
  );
}
