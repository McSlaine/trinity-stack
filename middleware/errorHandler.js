function errorHandler(err, req, res, next) {
    console.error("Unhandled error:", err);
    const statusCode = err.statusCode || 500;
    const errorMessage = err.message || 'An unexpected error occurred.';
    res.status(statusCode).json({
        error: {
            message: errorMessage,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        }
    });
}

module.exports = errorHandler;
