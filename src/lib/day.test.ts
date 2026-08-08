import { describe, expect, it } from "vitest";
import { TASHKENT_OFFSET_MINUTES, dayKey, labelForDay, recentDays, weekdayIndex } from "./day";

/**
 * Kun kalitlari.
 *
 * Bu hisob ota-ona panelidagi ekran vaqti chegarasini boshqaradi,
 * shuning uchun vaqt mintaqasi chegaralari aniq tekshiriladi: server
 * UTC'da ishlaydi, bola esa Toshkentda.
 */

describe("kun kaliti", () => {
  it("Toshkent yarim tunidan keyin YANGI kun boshlanadi", () => {
    // 2026-08-08 19:30 UTC = 2026-08-09 00:30 Toshkent.
    expect(dayKey(new Date("2026-08-08T19:30:00Z"))).toBe("2026-08-09");
  });

  it("Toshkent yarim tunidan oldin eski kun davom etadi", () => {
    // 2026-08-08 18:30 UTC = 2026-08-08 23:30 Toshkent.
    expect(dayKey(new Date("2026-08-08T18:30:00Z"))).toBe("2026-08-08");
  });

  it("UTC yarim tuni Toshkentda allaqachon ertaga", () => {
    /*
     * Server vaqtidan foydalanilsa, aynan shu lahzada bola uchun kun
     * bir necha soatga siljib ketardi.
     */
    expect(dayKey(new Date("2026-08-08T00:00:00Z"))).toBe("2026-08-08");
    expect(dayKey(new Date("2026-08-08T23:00:00Z"))).toBe("2026-08-09");
  });

  it("Postgres `date` ustuni kutgan ko'rinishda", () => {
    expect(dayKey(new Date("2026-01-02T10:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("mintaqa siljishi UTC+5", () => {
    expect(TASHKENT_OFFSET_MINUTES).toBe(300);
  });
});

describe("hafta kuni", () => {
  it("hafta DUSHANBADAN boshlanadi", () => {
    // 2026-08-10 — dushanba.
    expect(weekdayIndex(new Date("2026-08-10T06:00:00Z"))).toBe(0);
    expect(weekdayIndex(new Date("2026-08-16T06:00:00Z"))).toBe(6); // yakshanba
  });

  it("yorliq kun kalitidan to'g'ri olinadi", () => {
    expect(labelForDay("2026-08-10")).toBe("Du");
    expect(labelForDay("2026-08-16")).toBe("Ya");
  });
});

describe("oxirgi kunlar", () => {
  const at = new Date("2026-08-08T12:00:00Z");

  it("yettita kun qaytaradi", () => {
    expect(recentDays(7, at)).toHaveLength(7);
  });

  it("eng eskisidan bugungacha tartiblangan", () => {
    const days = recentDays(7, at);
    expect(days[0]).toBe("2026-08-02");
    expect(days[days.length - 1]).toBe("2026-08-08");
  });

  it("oxirgi element BUGUN — grafik shunga tayanadi", () => {
    // Ota-ona paneli `week[week.length - 1]` ni "bugun" deb oladi.
    const days = recentDays(7, at);
    expect(days[days.length - 1]).toBe(dayKey(at));
  });

  it("oy chegarasidan to'g'ri o'tadi", () => {
    const days = recentDays(3, new Date("2026-03-02T12:00:00Z"));
    expect(days).toEqual(["2026-02-28", "2026-03-01", "2026-03-02"]);
  });

  it("kabisa yilida fevral 29 tushib qolmaydi", () => {
    const days = recentDays(3, new Date("2028-03-01T12:00:00Z"));
    expect(days).toEqual(["2028-02-28", "2028-02-29", "2028-03-01"]);
  });
});
