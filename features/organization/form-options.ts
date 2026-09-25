export type FormSelectOption = {
  value: string;
  label: string;
};

export const INDUSTRY_OPTIONS: FormSelectOption[] = [
  { value: "technology", label: "Technology" },
  { value: "finance", label: "Finance & Banking" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
  { value: "realestate", label: "Real Estate" },
  { value: "hospitality", label: "Hospitality" },
  { value: "government", label: "Government" },
  { value: "retail", label: "Retail" },
  { value: "other", label: "Other" },
];

export const COMPANY_SIZE_OPTIONS: FormSelectOption[] = [
  { value: "1-10", label: "1–10 employees" },
  { value: "11-50", label: "11–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "201-500", label: "201–500 employees" },
  { value: "501+", label: "501+ employees" },
];

export const COUNTRY_OPTIONS: FormSelectOption[] = [
  { value: "AE", label: "United Arab Emirates" },
  { value: "SA", label: "Saudi Arabia" },
  { value: "BH", label: "Bahrain" },
  { value: "QA", label: "Qatar" },
  { value: "KW", label: "Kuwait" },
  { value: "OM", label: "Oman" },
  { value: "other", label: "Other" },
];

export const CURRENCY_OPTIONS: FormSelectOption[] = [
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "SAR", label: "SAR — Saudi Riyal" },
  { value: "BHD", label: "BHD — Bahraini Dinar" },
  { value: "QAR", label: "QAR — Qatari Riyal" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
];

export const TIMEZONE_OPTIONS: FormSelectOption[] = [
  { value: "Asia/Dubai", label: "Dubai (GMT+4)" },
  { value: "Asia/Riyadh", label: "Riyadh (GMT+3)" },
  { value: "Asia/Bahrain", label: "Bahrain (GMT+3)" },
  { value: "Asia/Qatar", label: "Qatar (GMT+3)" },
  { value: "Asia/Kolkata", label: "India (GMT+5:30)" },
  { value: "Europe/London", label: "London (GMT+0/+1)" },
  { value: "America/New_York", label: "New York (GMT-5/-4)" },
];

export const FISCAL_MONTH_OPTIONS: FormSelectOption[] = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export function optionLabel(options: FormSelectOption[], value: string) {
  return options.find((o) => o.value === value)?.label ?? value;
}
