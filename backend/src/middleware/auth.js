const jwt = require('jsonwebtoken');

// Verifies the Bearer token and attaches { id, roleId, roleName, email } to req.user
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Usage: requireRole('admin', 'dentist')
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.roleName)) {
      return res.status(403).json({ message: 'You do not have permission to do this' });
    }
    next();
  };
}

// Guards the /api/portal/* routes: only "patient" role logins with a linked
// patient record may proceed. Staff logins are rejected here even if they
// somehow hold a valid token, since portal handlers trust req.user.patientId
// completely (no :id route params) — this check is what makes that safe.
function requirePatient(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (req.user.roleName !== 'patient' || !req.user.patientId) {
    return res.status(403).json({ message: 'This area is for patient portal accounts only.' });
  }
  next();
}

module.exports = { requireAuth, requireRole, requirePatient };
