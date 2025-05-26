import { ZodError } from "zod";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  protected formatZodError(error: ZodError): Record<string, string> {
    return error.errors.reduce((acc: Record<string, string>, err) => {
      acc[err.path.join(".")] = err.message;
      return acc;
    }, {});
  }

  toJSON() {
    return {
      status: "error",
      statusCode: this.statusCode,
      message: this.message,
    };
  }
}

export class BadRequestError extends AppError {
  errors?: Record<string, string>;

  constructor(message: string, errors?: Record<string, string> | ZodError) {
    super(message, 400);

    if (errors instanceof ZodError) {
      this.errors = this.formatZodError(errors);
    } else if (errors) {
      this.errors = errors;
    }
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}

export class UnauthorizedError extends AppError {
  errors?: Record<string, string>;

  constructor(message: string, errors?: Record<string, string>) {
    super(message, 401);
    this.errors = errors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  errors: Record<string, string>;

  constructor(message: string, errors: Record<string, string>) {
    super(message, 422);
    this.errors = errors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}
