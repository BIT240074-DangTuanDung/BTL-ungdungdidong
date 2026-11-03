import type { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function check(
  value: unknown,
  status = 409,
  code = "CONFLICT",
  message = "Operation conflicts with current state.",
): asserts value {
  if (!value) throw new ApiError(status, code, message);
}
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res
      .status(400)
      .json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request.",
          fields: error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
      });
    return;
  }
  if (error instanceof ApiError) {
    res
      .status(error.status)
      .json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const status =
      error.code === "P2025"
        ? 404
        : ["P2002", "P2003", "P2004", "P2034"].includes(error.code)
          ? 409
          : 500;
    res
      .status(status)
      .json({
        error: {
          code:
            status === 404
              ? "NOT_FOUND"
              : status === 409
                ? "CONFLICT"
                : "INTERNAL_ERROR",
          message:
            status === 409
              ? "Data conflict; refresh and try again."
              : "Request could not be completed.",
        },
      });
    return;
  }
  const status =
    typeof error === "object" && error && "status" in error
      ? error.status
      : 500;
  if (status === 400 || status === 413) {
    res
      .status(status)
      .json({
        error: {
          code: "INVALID_BODY",
          message: "Invalid or oversized JSON body.",
        },
      });
    return;
  }
  res
    .status(500)
    .json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Request could not be completed.",
      },
    });
};
