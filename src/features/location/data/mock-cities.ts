import type { Locale } from "next-intl";

type MockCityRecord = {
  id: string;
  names: Record<Locale, string>;
  isAvailable: boolean;
};

export const MOCK_CITIES: readonly MockCityRecord[] = [
  {
    id: "riyadh",
    names: { ar: "الرياض", en: "Riyadh" },
    isAvailable: true,
  },
  {
    id: "jeddah",
    names: { ar: "جدة", en: "Jeddah" },
    isAvailable: true,
  },
  {
    id: "dammam",
    names: { ar: "الدمام", en: "Dammam" },
    isAvailable: true,
  },
  {
    id: "abha",
    names: { ar: "أبها", en: "Abha" },
    isAvailable: false,
  },
  {
    id: "talkha",
    names: { ar: "طلخا", en: "talkha" },
    isAvailable: true,
  },
  {
    id: "el-magzar",
    names: { ar: "المجزر", en: "el-magzar" },
    isAvailable: true,
  },
  {
    id: "samya-elgamal",
    names: { ar: "سامية الجمل", en: "samya el-gamal" },
    isAvailable: true,
  },
  {
    id: "drasat",
    names: { ar: "الدراسات", en: "el drasat" },
    isAvailable: true,
  },
  {
    id: "el-magzar",
    names: { ar: "المجزر", en: "el-magzar" },
    isAvailable: true,
  },
  {
    id: "samya-elgamal",
    names: { ar: "سامية الجمل", en: "samya el-gamal" },
    isAvailable: true,
  },
  {
    id: "talkha",
    names: { ar: "طلخا", en: "talkha" },
    isAvailable: true,
  },
  {
    id: "el-magzar",
    names: { ar: "المجزر", en: "el-magzar" },
    isAvailable: true,
  },
  {
    id: "samya-elgamal",
    names: { ar: "سامية الجمل", en: "samya el-gamal" },
    isAvailable: true,
  },
] as const;
