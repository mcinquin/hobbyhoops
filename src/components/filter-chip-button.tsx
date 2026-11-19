"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilterChipButtonProps {
  label: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  className?: string;
}

/** Toggle chip for a boolean filter (`aria-pressed`). */
export function FilterChipButton({
  label,
  pressed,
  onPressedChange,
  className,
}: FilterChipButtonProps) {
  return (
    <Button
      type="button"
      variant={pressed ? "default" : "outline"}
      size="sm"
      className={cn("h-8 text-xs px-2", className)}
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
    >
      {label}
    </Button>
  );
}
