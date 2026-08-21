"use client";

import * as React from "react";
import PhoneInput, { type Value } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";
import "@/styles/intl-phone-input.css";

import { cn } from "@/lib/utils";
import { PhoneCountrySelectRadix } from "@/components/phone-country-select-radix";

type SignupPhoneFieldProps = {
  id?: string;
  value: Value | undefined;
  onChange: (value: Value | undefined) => void;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  className?: string;
  /** Default country for the dial selector (ISO 3166-1 alpha-2). */
  defaultCountry?: React.ComponentProps<typeof PhoneInput>["defaultCountry"];
};

/**
 * International phone field: all countries, SVG flags, E.164 value.
 * Same pattern as the main MyVenueBooking signup form.
 */
export function SignupPhoneField({
  id,
  value,
  onChange,
  disabled,
  "aria-invalid": ariaInvalid,
  className,
  defaultCountry = "AE",
}: SignupPhoneFieldProps) {
  return (
    <div className={cn("phone-field-ui", className)}>
      <PhoneInput
        international
        defaultCountry={defaultCountry}
        flags={flags}
        countrySelectComponent={PhoneCountrySelectRadix}
        value={value}
        onChange={onChange}
        limitMaxLength
        smartCaret
        countryCallingCodeEditable={false}
        focusInputOnCountrySelection
        disabled={disabled}
        numberInputProps={{
          id,
          name: "phone",
          autoComplete: "tel",
          inputMode: "tel",
          "aria-invalid": ariaInvalid,
        }}
      />
    </div>
  );
}
