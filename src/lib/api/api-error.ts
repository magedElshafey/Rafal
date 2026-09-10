// src/lib/api/api-error.ts

type ApiErrorOptions = {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor({ status, message, code, details }: ApiErrorOptions) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
