"use client";

import { createAuthClient } from "better-auth/react";
import {
  inferAdditionalFields,
  adminClient,
  phoneNumberClient,
  emailOTPClient,
} from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  // baseURL berilmadi — client joriy origin'ni ishlatadi (dev port'iga bog'liq emas).
  plugins: [
    inferAdditionalFields<typeof auth>(),
    adminClient(),
    phoneNumberClient(),
    emailOTPClient(),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
