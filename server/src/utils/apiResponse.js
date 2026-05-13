/**
 * Standardized API Response Utility
 * Ensures all API responses follow the same format
 *
 * Response Format:
 * {
 *   success: boolean,
 *   message: string,
 *   data: any,
 *   timestamp: string (ISO format)
 * }
 */

class ApiResponse {
  /**
   * Send a success response
   * @param {import('express').Response} res
   * @param {any} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  static success(res, data, message = "Success", statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send a created response (201)
   * @param {import('express').Response} res
   * @param {any} data - Created resource data
   * @param {string} message - Success message
   */
  static created(res, data, message = "Created successfully") {
    return this.success(res, data, message, 201);
  }

  /**
   * Send an error response
   * @param {import('express').Response} res
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 400)
   * @param {any} errors - Additional error details
   */
  static error(
    res,
    message = "An error occurred",
    statusCode = 400,
    errors = null,
  ) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send a not found response (404)
   * @param {import('express').Response} res
   * @param {string} message - Not found message
   */
  static notFound(res, message = "Resource not found") {
    return this.error(res, message, 404);
  }

  /**
   * Send an unauthorized response (401)
   * @param {import('express').Response} res
   * @param {string} message - Unauthorized message
   */
  static unauthorized(res, message = "Unauthorized") {
    return this.error(res, message, 401);
  }

  /**
   * Send a forbidden response (403)
   * @param {import('express').Response} res
   * @param {string} message - Forbidden message
   */
  static forbidden(res, message = "Access denied") {
    return this.error(res, message, 403);
  }

  /**
   * Send a validation error response (422)
   * @param {import('express').Response} res
   * @param {any} errors - Validation errors
   * @param {string} message - Error message
   */
  static validationError(res, errors, message = "Validation failed") {
    return this.error(res, message, 422, errors);
  }
}

module.exports = ApiResponse;
