"use client";

import { useEffect } from "react";
import { getClientLogger } from "@/lib/client-logger";

const pwaLogger = getClientLogger("pwa");

/** Registers /sw.js in browsers that support Service Workers. */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          worker?.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New version available — force the waiting SW to activate.
              worker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch((error) => {
        pwaLogger.error({
          msg: "Service worker registration failed",
          err: error,
        });
      });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }, []);

  return null;
}
