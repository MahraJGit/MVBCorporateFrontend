import { toast } from "sonner";

export type BackendFieldError = {
  field: string;
  message: string;
};

export class ApiError extends Error {
  readonly statusCode: number;
  readonly fieldErrors?: BackendFieldError[];
  readonly code?: string;

  constructor(
    statusCode: number,
    message: string,
    fieldErrors?: BackendFieldError[],
    code?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
    this.code = code;
  }

  /** Alias used by some call sites. */
  get status() {
    return this.statusCode;
  }

  static fromUnknown(statusCode: number, body: unknown): ApiError {
    if (typeof body === "object" && body !== null) {
      const o = body as Record<string, unknown>;
      const message = typeof o.message === "string" ? o.message : "Request failed";
      const errs = Array.isArray(o.errors) ? o.errors : undefined;
      const fieldErrors = errs
        ?.map((e) => {
          if (typeof e !== "object" || e === null) return null;
          const fe = e as Record<string, unknown>;
          if (typeof fe.field !== "string" || typeof fe.message !== "string") return null;
          return { field: fe.field, message: fe.message };
        })
        .filter(Boolean) as BackendFieldError[] | undefined;
      let code: string | undefined;
      if (o.errors && typeof o.errors === "object" && !Array.isArray(o.errors)) {
        const extra = o.errors as Record<string, unknown>;
        if (typeof extra.code === "string") code = extra.code;
      }
      return new ApiError(statusCode, message, fieldErrors, code);
    }
    return new ApiError(statusCode, "Request failed");
  }
}

/**
 * Resolve an error message. When `fallback` is provided, also shows a toast
 * (used by pages that call `toastApiError(err, "…")` without wrapping toast.error).
 * When omitted, returns the string only (caller toasts, e.g. login).
 */
export function toastApiError(err: unknown, fallback?: string): string {
  let message = "Something went wrong. Please try again.";

  if (err instanceof ApiError) {
    if (err.fieldErrors?.length === 1) {
      message = err.fieldErrors[0].message;
    } else if (err.fieldErrors && err.fieldErrors.length > 1) {
      message =
        fallback ||
        err.fieldErrors.map((fe) => fe.message).join(" · ") ||
        err.message;
    } else {
      message = err.message || fallback || message;
    }
  } else if (err instanceof Error) {
    message = err.message || fallback || message;
  } else if (fallback) {
    message = fallback;
  }

  if (fallback !== undefined) {
    toast.error(message);
  }

  return message;
}

/** Map backend field errors onto a local field-error record. Returns true if any mapped. */
export function applyApiFieldErrors(
  err: unknown,
  setErrors: (errors: Record<string, string>) => void,
  allowedFields?: string[],
): boolean {
  if (!(err instanceof ApiError) || !err.fieldErrors?.length) return false;

  const next: Record<string, string> = {};
  for (const fe of err.fieldErrors) {
    const field = fe.field.replace(/^body\./, "").replace(/^query\./, "");
    if (allowedFields && !allowedFields.includes(field)) continue;
    if (!next[field]) next[field] = fe.message;
  }

  if (!Object.keys(next).length) return false;
  setErrors(next);
  return true;
}
