import parsePhoneNumber from "libphonenumber-js/max";
import { isValidPhoneNumber } from "libphonenumber-js/max";
import type { Value } from "react-phone-number-input";

/** Normalized parts for register APIs (matches backend `phone` + `phoneCountryCode`). */
export function e164ToApiParts(
  e164: string | undefined,
): { phoneCountryCode: string; phone: string } | null {
  if (!e164?.trim()) return null;
  try {
    const parsed = parsePhoneNumber(e164);
    if (!parsed?.isValid()) return null;
    return {
      phoneCountryCode: `+${parsed.countryCallingCode}`,
      phone: parsed.nationalNumber,
    };
  } catch {
    return null;
  }
}

export function isE164Valid(e164: string | undefined): boolean {
  if (!e164?.trim()) return false;
  return isValidPhoneNumber(e164);
}

export function toPhoneInputValue(raw: string | null | undefined): Value | undefined {
  const trimmed = raw?.trim();
  if (!trimmed || !isE164Valid(trimmed)) return undefined;
  return trimmed as Value;
}
