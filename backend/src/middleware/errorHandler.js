// Catches errors from asyncHandler-wrapped routes and any next(err) calls.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[error]', err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'That record already exists.' });
  }

  // Multer surfaces upload problems (file too large, wrong field name) with
  // a `code` like 'LIMIT_FILE_SIZE'; fileFilter rejections just throw a
  // plain Error with a friendly message already set.
  if (err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File is too large. Maximum size is 15MB.'
      : err.message;
    return res.status(400).json({ message });
  }
  if (err.message && err.message.includes('Only JPEG, PNG, WEBP, HEIC images or PDF')) {
    return res.status(400).json({ message: err.message });
  }

  const status = err.status || 500;
  const message = status === 500 ? 'Something went wrong on our end.' : err.message;

  res.status(status).json({ message });
}

function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFound };
