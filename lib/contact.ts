export const CONTACT_LIMITS = { name: 60, email: 254, msg: 2000 } as const;

export interface ContactInput {
  name: string;
  email: string;
  msg: string;
}

export type ContactResult =
  | { status: "idle" }
  | { status: "success"; name: string }
  | { status: "error"; message: string };

const EMAIL_RE = /^[^\s@<>"',;:]+@[^\s@<>"',;:]+\.[^\s@<>"',;:]+$/;

export function validateContact(
  raw: Record<string, unknown>,
): { ok: true; value: ContactInput } | { ok: false } {
  const { name, email, msg } = raw;
  if (typeof name !== "string" || typeof email !== "string" || typeof msg !== "string") {
    return { ok: false };
  }

  const value: ContactInput = {
    name: name.trim(),
    email: email.trim(),
    msg: msg.trim(),
  };

  if (!value.name || !value.email || !value.msg) return { ok: false };
  if (
    value.name.length > CONTACT_LIMITS.name ||
    value.email.length > CONTACT_LIMITS.email ||
    value.msg.length > CONTACT_LIMITS.msg
  ) {
    return { ok: false };
  }
  if (!EMAIL_RE.test(value.email)) return { ok: false };

  return { ok: true, value };
}
