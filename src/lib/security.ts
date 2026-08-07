import "server-only";

import { env, publicEnv } from "@/lib/env";

function sameOrigin(origin: string | null, expected: string) {
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(expected).origin;
  } catch {
    return false;
  }
}

export function assertSameOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (sameOrigin(origin, env.BETTER_AUTH_URL) || sameOrigin(origin, publicEnv.appUrl)) return null;
  return Response.json({ error: "So'rov manbasi rad etildi" }, { status: 403 });
}

export async function readJsonWithLimit(request: Request, maxBytes: number) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return {
      ok: false as const,
      response: Response.json({ error: "Ma'lumot juda katta" }, { status: 413 }),
    };
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > maxBytes) {
    return {
      ok: false as const,
      response: Response.json({ error: "Ma'lumot juda katta" }, { status: 413 }),
    };
  }

  try {
    return { ok: true as const, data: JSON.parse(raw) as unknown };
  } catch {
    return {
      ok: false as const,
      response: Response.json({ error: "Ma'lumot o'qilmadi" }, { status: 400 }),
    };
  }
}
