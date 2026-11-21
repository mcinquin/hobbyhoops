/**
 * English UI strings for assertions, read from the app's own catalog so tests
 * follow copy changes instead of hard-coding them.
 */
import en from "../../messages/en.json";

/** Resolves a dotted key in `messages/en.json` and fills `{param}` placeholders. */
export function t(key: string, params?: Record<string, string | number>): string {
  let current: unknown = en;
  for (const part of key.split(".")) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      throw new Error(`Missing English message: ${key}`);
    }
  }
  if (typeof current !== "string") {
    throw new Error(`Message is not a string: ${key}`);
  }
  let result = current;
  for (const [name, value] of Object.entries(params ?? {})) {
    result = result.replaceAll(`{${name}}`, String(value));
  }
  return result;
}
