"use client";

import { useState } from "react";

/** Pending upload / removal state for one side of the card photos. */
export type PendingPhoto = {
  file: File | null;
  cleared: boolean;
  change: (file: File | null) => void;
  clear: () => void;
  restore: () => void;
};

/** Local state for a photo picked (or removed) but not uploaded yet. */
export function usePendingPhoto(): PendingPhoto {
  const [file, setFile] = useState<File | null>(null);
  const [cleared, setCleared] = useState(false);
  return {
    file,
    cleared,
    change: (next) => {
      setFile(next);
      if (next) setCleared(false);
    },
    clear: () => {
      setFile(null);
      setCleared(true);
    },
    restore: () => setCleared(false),
  };
}
