"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  createSiteAuthToken,
  getSitePassword,
  SITE_AUTH_COOKIE,
  SITE_AUTH_MAX_AGE_SECONDS,
  verifySitePassword,
} from "@/lib/site-auth";

export type LoginResult = { success: true } | { success: false; error: string };

function safeNextPath(raw: string | null | undefined): string {
  if (!raw?.startsWith("/") || raw.startsWith("//")) {
    return "/";
  }
  return raw;
}

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? "/"));

  if (!getSitePassword()) {
    return {
      error: "Password protection is not configured (SITE_PASSWORD missing).",
      success: false,
    };
  }

  const valid = verifySitePassword(password);
  if (!valid) {
    return { error: "Incorrect password.", success: false };
  }

  const token = await createSiteAuthToken(password);
  const jar = await cookies();
  jar.set(SITE_AUTH_COOKIE, token, {
    httpOnly: true,
    maxAge: SITE_AUTH_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect(next);
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(SITE_AUTH_COOKIE);
  redirect("/login");
}
