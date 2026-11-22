"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InlineReferenceAddProps {
  label: string;
  buttonLabel: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  isBusy: boolean;
  disabled?: boolean;
}

/** Small "new value + add button" row used to create a brand or set inline. */
export function InlineReferenceAdd({
  label,
  buttonLabel,
  placeholder,
  value,
  onChange,
  onAdd,
  isBusy,
  disabled = false,
}: InlineReferenceAddProps) {
  const isDisabled = isBusy || disabled;
  return (
    <div className="flex flex-wrap gap-2 items-end pt-1">
      <div className="flex-1 min-w-[140px] space-y-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          placeholder={placeholder}
          disabled={isDisabled}
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="shrink-0"
        disabled={isDisabled}
        onClick={onAdd}
      >
        {isBusy ? "…" : buttonLabel}
      </Button>
    </div>
  );
}
