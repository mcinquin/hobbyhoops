"use client";

import { useEffect, useMemo } from "react";

/** Temporary `blob:` URL to preview a local file, revoked when the file changes or on unmount. */
export function useObjectUrl(file: File | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);
  return url;
}
