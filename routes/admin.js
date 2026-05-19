const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// All routes require admin authentication
router.use(isAuthenticated);
router.use(isAdmin);

// List all users
router.get('/users', (req, res) => {
  const sql = 'SELECT id, username, email, full_name, role, department, created_at FROM users ORDER BY created_at DESC';

  db.all(sql, [], (err, users) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur serveur');
    }
    res.render('admin/users', {
      title: 'Gestion des Utilisateurs',
      users,
      message: req.query.message || null
    });
  });
});

// New user form
router.get('/users/new', (req, res) => {
  res.render('admin/user-form', {
    title: 'Nouvel Utilisateur',
    editUser: null,
    action: '/admin/users'
  });
});

// Create user
router.post('/users', async (req, res) => {
  const { username, password, email, full_name, role, department } = req.body;

  if (!username || !password) {
    return res.redirect('/admin/users/new?error=Nom d\'utilisateur et mot de passe requis');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const dept = role === 'admin' ? '' : (department || '');

  const sql = `INSERT INTO users (username, password, email, full_name, role, department)
               VALUES (?, ?, ?, ?, ?, ?)`;

  db.run(sql, [username, hashedPassword, email, full_name, role || 'user', dept], function(err) {
    if (err) {
      console.error(err);
      if (err.message.includes('UNIQUE')) {
        return res.redirect('/admin/users/new?error=Ce nom d\'utilisateur existe déjà');
      }
      return res.status(500).send('Erreur lors de la création');
    }
    res.redirect('/admin/users?message=Utilisateur créé avec succès');
  });
});

// Edit user form
router.get('/users/:id/edit', (req, res) => {
  const sql = 'SELECT id, username, email, full_name, role, department FROM users WHERE id = ?';
  
  db.get(sql, [req.params.id], (err, editUser) => {
    if (err || !editUser) {
      return res.status(404).send('Utilisateur non trouvé');
    }
    res.render('admin/user-form', {
      title: 'Modifier Utilisateur',
      editUser,
      action: `/admin/users/${editUser.id}?_method=PUT`
    });
  });
});

// Update user
router.put('/users/:id', async (req, res) => {
  const { username, password, email, full_name, role, department } = req.body;
  const dept = role === 'admin' ? '' : (department || '');

  let sql, params;

  if (password && password.trim() !== '') {
    const hashedPassword = await bcrypt.hash(password, 10);
    sql = `UPDATE users SET username = ?, password = ?, email = ?, full_name = ?, role = ?, department = ?,
           updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    params = [username, hashedPassword, email, full_name, role, dept, req.params.id];
  } else {
    sql = `UPDATE users SET username = ?, email = ?, full_name = ?, role = ?, department = ?,
           updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    params = [username, email, full_name, role, dept, req.params.id];
  }

  db.run(sql, params, function(err) {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur lors de la mise à jour');
    }
    res.redirect('/admin/users?message=Utilisateur mis à jour');
  });
});

// Delete user
router.delete('/users/:id', (req, res) => {
  const userId = req.params.id;
  
  // Prevent deleting self
  if (userId == req.session.user.id) {
    return res.redirect('/admin/users?error=Vous ne pouvez pas supprimer votre propre compte');
  }
  
  const sql = 'DELETE FROM users WHERE id = ?';
  
  db.run(sql, [userId], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur lors de la suppression');
    }
    res.redirect('/admin/users?message=Utilisateur supprimé');
  });
});

// ── Permissions editor ────────────────────────────────────────────────
const perms = require('../config/permissions');

router.get('/permissions', (req, res) => {
  res.render('admin/permissions', {
    title: 'Éditeur de Permissions',
    permsData: perms.getAll(),
    labels:    perms.getLabels(),
    message:   req.query.message || null,
  });
});

router.post('/permissions', (req, res) => {
  const roles = ['user', 'trainer', 'supervisor', 'admin'];
  const keys  = perms.getLabels().map(l => l.key);
  const rows  = [];

  roles.forEach(role => {
    keys.forEach(key => {
      // Admin always keeps admin_* permissions ON
      const forced = (role === 'admin' && key.startsWith('admin_'));
      const allowed = forced ? 1 : (req.body[`${role}__${key}`] === '1' ? 1 : 0);
      rows.push([role, key, allowed]);
    });
  });

  db.run('DELETE FROM role_permissions', [], () => {
    let done = 0;
    rows.forEach(([role, key, allowed]) => {
      db.run('INSERT INTO role_permissions (role, permission_key, allowed) VALUES (?,?,?)',
        [role, key, allowed], () => {
          done++;
          if (done === rows.length) {
            perms.load(() => res.redirect('/admin/permissions?message=Permissions sauvegardées avec succès'));
          }
        });
    });
  });
});

module.exports = router;
