import "server-only";
import { getServerEnv } from "@/lib/env";

export interface EnabledProviders {
  google: boolean;
  github: boolean;
}

/**
 * Qaysi OAuth provayderlari sozlangani (env kalitlari mavjudligi) ni qaytaradi.
 * Bu ma'lumot server komponentlaridan auth formalariga uzatiladi — sozlanmagan
 * tugmalar ko'rsatilmaydi (bosilganda xatolik bermaydi).
 */
export function getEnabledProviders(): EnabledProviders {
  const env = getServerEnv();
  return {
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
  };
}
