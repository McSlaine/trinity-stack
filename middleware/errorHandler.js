module.exports = (err, req, res, next) => {
  console.error('Unhandled Error:', err.stack || err);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation Error', details: err.message });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized', details: err.message });
  }
  
  // Default error response
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}; 