export type BackendFieldError = {
  field: string;
  message: string;
};

export class ApiError extends Error {
  readonly statusCode: number;
  readonly fieldErrors?: BackendFieldError[];

  constructor(statusCode: number, message: string, fieldErrors?: BackendFieldError[]) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
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
      return new ApiError(statusCode, message, fieldErrors);
    }
    return new ApiError(statusCode, "Request failed");
  }
}

export function toastApiError(err: unknown): string {
  if (err instanceof ApiError) {
    // Prefer a global message; field errors should be shown inline by the caller.
    return err.message || "Something went wrong. Please try again.";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
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

