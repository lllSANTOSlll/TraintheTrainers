const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../config/database');
const msal = require('@azure/msal-node');

// ── MSAL config (Microsoft SSO) ───────────────────────────
const SSO_ENABLED = !!(process.env.SSO_CLIENT_ID && process.env.SSO_TENANT_ID && process.env.SSO_CLIENT_SECRET);

let cca = null;
if (SSO_ENABLED) {
  cca = new msal.ConfidentialClientApplication({
    auth: {
      clientId:     process.env.SSO_CLIENT_ID,
      authority:    `https://login.microsoftonline.com/${process.env.SSO_TENANT_ID}`,
      clientSecret: process.env.SSO_CLIENT_SECRET,
    }
  });
}

const SSO_REDIRECT_URI = process.env.SSO_REDIRECT_URI || 'http://localhost:5000/auth/sso/callback';
const SSO_SCOPES = ['openid', 'profile', 'email', 'User.Read'];

// ── Login page ────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', {
    title: 'Connexion',
    message: req.query.message || null,
    error:   req.query.error   || null,
    ssoEnabled: SSO_ENABLED
  });
});

// ── Login POST (username/password) ────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.redirect('/login?error=Veuillez remplir tous les champs');
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) return res.redirect('/login?error=Erreur serveur');
    if (!user) return res.redirect('/login?error=Nom d\'utilisateur ou mot de passe incorrect');

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.redirect('/login?error=Nom d\'utilisateur ou mot de passe incorrect');

    req.session.user = {
      id: user.id, username: user.username,
      email: user.email, full_name: user.full_name, role: user.role,
      department: user.department || ''
    };
    res.redirect('/dashboard');
  });
});

// ── SSO — redirect to Microsoft login ────────────────────
router.get('/auth/sso', async (req, res) => {
  if (!SSO_ENABLED || !cca) return res.redirect('/login?error=SSO non configuré');

  try {
    const url = await cca.getAuthCodeUrl({
      scopes:      SSO_SCOPES,
      redirectUri: SSO_REDIRECT_URI,
    });
    res.redirect(url);
  } catch (err) {
    console.error('SSO redirect error:', err);
    res.redirect('/login?error=Erreur SSO — vérifiez la configuration');
  }
});

// ── SSO — callback from Microsoft ────────────────────────
router.get('/auth/sso/callback', async (req, res) => {
  if (!SSO_ENABLED || !cca) return res.redirect('/login?error=SSO non configuré');

  const { code, error, error_description } = req.query;

  if (error) {
    console.error('SSO callback error:', error, error_description);
    return res.redirect(`/login?error=${encodeURIComponent(error_description || error)}`);
  }

  try {
    const tokenResponse = await cca.acquireTokenByCode({
      code,
      scopes:      SSO_SCOPES,
      redirectUri: SSO_REDIRECT_URI,
    });

    const { account, idTokenClaims } = tokenResponse;
    const email     = idTokenClaims.preferred_username || idTokenClaims.email || account.username;
    const fullName  = idTokenClaims.name || account.name || email;
    const username  = email.split('@')[0];

    // Find or auto-create user in DB
    db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username], async (err, user) => {
      if (err) return res.redirect('/login?error=Erreur base de données');

      if (user) {
        // Existing user — log in
        req.session.user = {
          id: user.id, username: user.username,
          email: user.email, full_name: user.full_name, role: user.role,
          department: user.department
        };
        return res.redirect('/dashboard');
      }

      // New user — auto-create with role 'user'
      const placeholder = await bcrypt.hash(Math.random().toString(36), 10);
      db.run(
        `INSERT INTO users (username, email, full_name, password, role, department)
         VALUES (?, ?, ?, ?, 'user', '')`,
        [username, email, fullName, placeholder],
        function(err2) {
          if (err2) return res.redirect('/login?error=Erreur création utilisateur');
          req.session.user = {
            id: this.lastID, username, email,
            full_name: fullName, role: 'user', department: ''
          };
          res.redirect('/dashboard');
        }
      );
    });

  } catch (err) {
    console.error('SSO token error:', err);
    res.redirect('/login?error=Erreur lors de l\'authentification SSO');
  }
});

// ── Logout ────────────────────────────────────────────────
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login?message=Vous avez été déconnecté');
  });
});

module.exports = router;
