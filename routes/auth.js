const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../config/database');

// Login page
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('login', { 
    title: 'Connexion',
    message: req.query.message || null,
    error: req.query.error || null
  });
});

// Login POST
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.redirect('/login?error=Veuillez remplir tous les champs');
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      console.error(err);
      return res.redirect('/login?error=Erreur serveur');
    }

    if (!user) {
      return res.redirect('/login?error=Nom d\'utilisateur ou mot de passe incorrect');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.redirect('/login?error=Nom d\'utilisateur ou mot de passe incorrect');
    }

    // Create session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    };

    res.redirect('/dashboard');
  });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erreur lors de la déconnexion:', err);
    }
    res.redirect('/login?message=Vous avez été déconnecté');
  });
});

module.exports = router;
