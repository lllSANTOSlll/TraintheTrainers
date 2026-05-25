function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login?message=Veuillez vous connecter');
}

function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.status(403).render('error', {
    title: 'Accès refusé',
    message: 'Cette action nécessite des permissions Administrateur.',
    error: { status: 403 }
  });
}

function isSupervisorOrAdmin(req, res, next) {
  if (req.session && req.session.user && 
      (req.session.user.role === 'admin' || req.session.user.role === 'supervisor')) {
    return next();
  }
  res.status(403).render('error', {
    title: 'Accès refusé',
    message: 'Cette action nécessite des permissions Superviseur ou Administrateur.',
    error: { status: 403 }
  });
}

function canManage(user) {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'supervisor';
}

// Returns the department to filter queries by.
// Admin with no selection: null (show all).
// Non-admin with dept set: their department string.
// Non-admin with NO dept set: '__no_dept__' (matches nothing — shows 0 rows).
function getDeptFilter(req) {
  const user = req.session && req.session.user;
  if (!user) return null;
  if (user.role === 'admin') return req.session.adminDept || null;
  return user.department || '__no_dept__';
}

function requirePermission(permKey) {
  return function (req, res, next) {
    const user = req.session && req.session.user;
    if (!user) return res.redirect('/login');
    const perms = require('../config/permissions');
    if (perms.can(user.role, permKey, user.department)) return next();
    res.status(403).render('error', {
      title: 'Accès refusé',
      message: 'Vous n\'avez pas la permission d\'accéder à cette page.',
      error: { status: 403 }
    });
  };
}

module.exports = {
  isAuthenticated,
  isAdmin,
  isSupervisorOrAdmin,
  requirePermission,
  canManage,
  getDeptFilter
};