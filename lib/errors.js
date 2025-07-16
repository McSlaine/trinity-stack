class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource Not Found') {
    super(message, 404);
  }
}

class AuthError extends AppError {
  constructor(message = 'Unauthorised') {
    super(message, 401);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  NotFoundError,
  AuthError
};
