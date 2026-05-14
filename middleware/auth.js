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

module.exports = {
  isAuthenticated,
  isAdmin,
  isSupervisorOrAdmin,
  canManage
};