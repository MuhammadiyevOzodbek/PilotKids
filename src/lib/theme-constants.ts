/**
 * Tema uchun umumiy konstantalar — server va client tomonida ham ishlatiladi.
 *
 * MUHIM: bu fayl "use client" BO'LMASLIGI kerak. Aks holda undan import
 * qilingan qiymatlar server modullarida (masalan, <head> inline theme skripti)
 * client-reference proxy'ga aylanib, string sifatida buzilib chiqadi.
 */
export const THEME_STORAGE_KEY = "pk-theme";
