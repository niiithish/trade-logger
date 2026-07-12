import { describe, expect, test } from "bun:test";

import { createSiteAuthToken, verifySitePassword } from "@/lib/site-auth";

describe("site auth tokens", () => {
  test("same password+secret produces stable token", async () => {
    const a = await createSiteAuthToken("secret-pass", "salt");
    const b = await createSiteAuthToken("secret-pass", "salt");
    expect(a).toBe(b);
    expect(a.length).toBe(64);
  });

  test("different passwords produce different tokens", async () => {
    const a = await createSiteAuthToken("one", "salt");
    const b = await createSiteAuthToken("two", "salt");
    expect(a).not.toBe(b);
  });
});

describe("verifySitePassword", () => {
  test("returns false when SITE_PASSWORD unset", () => {
    const prev = process.env.SITE_PASSWORD;
    delete process.env.SITE_PASSWORD;
    try {
      expect(verifySitePassword("anything")).toBe(false);
    } finally {
      if (prev === undefined) {
        delete process.env.SITE_PASSWORD;
      } else {
        process.env.SITE_PASSWORD = prev;
      }
    }
  });

  test("accepts matching password from env", () => {
    const prev = process.env.SITE_PASSWORD;
    process.env.SITE_PASSWORD = "Nithish@06";
    try {
      expect(verifySitePassword("Nithish@06")).toBe(true);
      expect(verifySitePassword("wrong")).toBe(false);
    } finally {
      if (prev === undefined) {
        delete process.env.SITE_PASSWORD;
      } else {
        process.env.SITE_PASSWORD = prev;
      }
    }
  });
});
