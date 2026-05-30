import { z } from "zod";

export function normalizeUsername(raw: string): string | null {
  const u = raw.trim();
  if (u.length < 3 || u.length > 32) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(u)) return null;
  return u;
}

export const MIN_PASSWORD_LENGTH = 24;

export type AuthValidationError = {
  key: string;
  params?: Record<string, string | number>;
};

export function validateNewPassword(p: string): AuthValidationError | null {
  if (p.length < MIN_PASSWORD_LENGTH) {
    return { key: "errors.passwordMin", params: { min: MIN_PASSWORD_LENGTH } };
  }
  return null;
}

const usernameSchema = z
  .string()
  .transform((value) => normalizeUsername(value))
  .refine((value): value is string => value !== null, {
    message: "errors.bootstrapUsernameInvalid",
  });

export const loginSchema = z
  .object({
    username: usernameSchema,
    password: z.string().min(1, "errors.loginRequired"),
  })
  .strict();

export const bootstrapSchema = z
  .object({
    username: usernameSchema,
    password: z.string().min(1, "errors.loginRequired"),
  })
  .strict();

export const profileUpdateSchema = z
  .object({
    currentPassword: z.string().min(1, "errors.profileCurrentRequired"),
    newUsername: z.string().optional(),
    newPassword: z.string().optional(),
  })
  .strict();
