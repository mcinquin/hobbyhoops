import { afterEach, describe, expect, it, vi } from "vitest";
import { formatLogRecord, writeLogRecord } from "@/lib/log-record";

describe("log-record", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("formats JSON with ISO 8601 time, string level, and scope", () => {
    const parsed = JSON.parse(
      formatLogRecord("error", "pwa", {
        msg: "Service worker registration failed",
        err: new Error("blocked"),
      })
    ) as {
      level: string;
      time: string;
      scope: string;
      msg: string;
      err: { type: string; message: string };
    };

    expect(parsed.time).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
    expect(parsed.level).toBe("error");
    expect(parsed.scope).toBe("pwa");
    expect(parsed.msg).toBe("Service worker registration failed");
    expect(parsed.err.type).toBe("Error");
    expect(parsed.err.message).toBe("blocked");
  });

  it("writes error records to console.error", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    writeLogRecord("error", "error-boundary", {
      msg: "Page error",
      err: new Error("boom"),
    });

    expect(error).toHaveBeenCalledOnce();
    const parsed = JSON.parse(String(error.mock.calls[0]?.[0])) as {
      level: string;
      scope: string;
      msg: string;
    };
    expect(parsed.level).toBe("error");
    expect(parsed.scope).toBe("error-boundary");
    expect(parsed.msg).toBe("Page error");
  });
});
