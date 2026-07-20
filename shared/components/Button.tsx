"use client";

import { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/utils/cn";

type Variant = "primary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/** Same visual classes as the original inline buttons — no redesign. */
export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  const base = variant === "primary" ? "btn-primary" : "btn-ghost";
  return (
    <button className={cn(base, className)} {...props}>
      {children}
    </button>
  );
}
