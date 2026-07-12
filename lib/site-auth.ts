/** Cookie + token helpers for simple site password gate. */

export const SITE_AUTH_COOKIE = "tl_site_auth";

/** Cookie max age: 30 days. */
export const SITE_AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function getSitePassword(): string | null {
  const value = process.env.SITE_PASSWORD?.trim();
  return value ? value : null;
}

export function getSiteAuthSecret(): string {
  return (
    process.env.SITE_AUTH_SECRET?.trim() ||
    process.env.SITE_PASSWORD?.trim() ||
    "trade-logger-dev-secret"
  );
}

/** Stable session token derived from password + secret (Edge-safe). */
export async function createSiteAuthToken(
  password: string,
  secret: string = getSiteAuthSecret()
): Promise<string> {
  const data = new TextEncoder().encode(`tl-auth:v1:${password}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidSiteAuthToken(
  token: string | undefined | null
): Promise<boolean> {
  const password = getSitePassword();
  if (!(password && token)) {
    return false;
  }
  const expected = await createSiteAuthToken(password);
  return token === expected;
}

export function verifySitePassword(input: string): boolean {
  const password = getSitePassword();
  if (!password) {
    return false;
  }
  return input === password;
}
