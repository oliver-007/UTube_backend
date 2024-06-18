class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went worng!",
    errors = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.stack = stack;
    this.data = null;
    this.success = false;

    // ++++++ In modern Node.js versions (generally those introduced after Node.js v10), the Error class constructor automatically generates a stack trace by default. So, you might not always need to explicitly call Error.captureStackTrace() in your custom error classes. ++++++
    // if (stack) {
    //   this.stack = stack;
    // } else {
    //   Error.captureStackTrace(this, this.constructor);
    // }
  }
}

export { ApiError };
