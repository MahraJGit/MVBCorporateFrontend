import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import de from "@/messages/de.json";
import fr from "@/messages/fr.json";
import ur from "@/messages/ur.json";

type MessageTree = { [key: string]: string | MessageTree };

const catalogs: Record<string, MessageTree> = { en, ar, de, fr, ur };

export const SUPPORTED_LOCALES = [
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr" as const },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" as const },
  { code: "de", label: "German", nativeLabel: "Deutsch", dir: "ltr" as const },
  { code: "fr", label: "French", nativeLabel: "Français", dir: "ltr" as const },
  { code: "ur", label: "Urdu", nativeLabel: "اردو", dir: "rtl" as const },
] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]["code"];

const STORAGE_KEY = "venue-corporate-locale";

function resolvePath(tree: MessageTree, key: string): string | undefined {
  const value = key.split(".").reduce<string | MessageTree | undefined>((node, part) => {
    if (typeof node === "string" || node === undefined) return undefined;
    return node[part];
  }, tree);
  return typeof value === "string" ? value : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name];
    return value === undefined ? `{${name}}` : String(value);
  });
}

export function isAppLocale(value: string): value is AppLocale {
  return SUPPORTED_LOCALES.some((l) => l.code === value);
}

export function getLocaleMeta(code: string) {
  return SUPPORTED_LOCALES.find((l) => l.code === code) ?? SUPPORTED_LOCALES[0];
}

export function readStoredLocale(): AppLocale | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)?.trim().toLowerCase();
    if (raw && isAppLocale(raw)) return raw;
  } catch {
    // ignore
  }
  return null;
}

export function detectLocale(): AppLocale {
  const stored = readStoredLocale();
  if (stored) return stored;

  if (typeof document !== "undefined") {
    const htmlLang = document.documentElement.lang?.trim().toLowerCase();
    if (htmlLang && isAppLocale(htmlLang)) return htmlLang;
    const short = htmlLang?.split("-")[0];
    if (short && isAppLocale(short)) return short;
  }

  if (typeof navigator !== "undefined") {
    const nav = navigator.language?.toLowerCase() ?? "en";
    if (isAppLocale(nav)) return nav;
    const short = nav.split("-")[0];
    if (isAppLocale(short)) return short;
  }

  return "en";
}

export function applyDocumentLocale(locale: AppLocale) {
  if (typeof document === "undefined") return;
  const meta = getLocaleMeta(locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = meta.dir;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore
  }
}

/** Lightweight copy helper until full next-intl is added. */
export function t(
  key: string,
  params?: Record<string, string | number>,
  locale: string = detectLocale(),
) {
  const catalog = catalogs[locale] ?? catalogs.en;
  const message =
    resolvePath(catalog, key) ?? resolvePath(catalogs.en, key);
  if (!message) return key;
  return interpolate(message, params);
}

/** Plural suffix helper for simple `{plural}` placeholders (`""` or `"s"`). */
export function plural(count: number) {
  return count === 1 ? "" : "s";
}
