// Catches errors from asyncHandler-wrapped routes and any next(err) calls.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[error]', err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'That record already exists.' });
  }

  const status = err.status || 500;
  const message = status === 500 ? 'Something went wrong on our end.' : err.message;

  res.status(status).json({ message });
}

function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFound };
