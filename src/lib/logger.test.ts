import { afterEach, describe, expect, it, vi } from "vitest";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits JSON with ISO 8601 time, string level, and scope", async () => {
    const write = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const { getLogger } = await import("@/lib/logger");
    getLogger("test").info({ msg: "hello" });

    const line = write.mock.calls
      .map(([chunk]) => String(chunk))
      .find((chunk) => chunk.includes('"msg":"hello"'));
    expect(line).toBeDefined();

    const parsed = JSON.parse(String(line)) as {
      time: string;
      level: string;
      scope: string;
      msg: string;
    };

    expect(parsed.time).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
    expect(parsed.level).toBe("info");
    expect(parsed.scope).toBe("test");
    expect(parsed.msg).toBe("hello");
  });
});
