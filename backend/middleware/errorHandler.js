/**
 * middleware/errorHandler.js — Centralised error handling
 *
 * notFound   → catches any unmatched route and returns 404
 * errorHandler → catches errors forwarded via next(err) and returns 500
 */

/**
 * 404 handler — must be registered AFTER all routes.
 */
export function notFound(req, res) {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
  });
}

/**
 * Global error handler — must be registered last with 4 parameters.
 * @param {Error}  err
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error("[Error]", err.message);
  res.status(500).json({
    error: err.message || "Internal server error",
  });
}
