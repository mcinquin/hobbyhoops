"use client";

import { useEffect } from "react";
import { safeInternalRedirectPath } from "@/lib/safe-redirect";

async function hasActiveSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

function redirectToApp(from: string | null): void {
  window.location.assign(safeInternalRedirectPath(from));
}

/**
 * Sur mobile (Android Chrome, PWA), la session peut exister côté navigateur
 * sans être visible sur la première requête HTML (lien externe, onglet
 * restauré, lancement PWA). On reprobe au chargement, à la reprise de l’app
 * et au premier geste utilisateur.
 */
export function useSessionRecoveryOnLogin(from: string | null): void {
  useEffect(() => {
    let cancelled = false;

    async function recover(): Promise<void> {
      if (cancelled) return;
      if (await hasActiveSession()) {
        redirectToApp(from);
      }
    }

    void recover();

    function onUserGesture(): void {
      void recover();
    }

    function onPageShow(event: PageTransitionEvent): void {
      if (event.persisted) void recover();
    }

    function onVisibilityChange(): void {
      if (document.visibilityState === "visible") void recover();
    }

    document.addEventListener("pointerdown", onUserGesture, { once: true });
    document.addEventListener("keydown", onUserGesture, { once: true });
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("pointerdown", onUserGesture);
      document.removeEventListener("keydown", onUserGesture);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [from]);
}
