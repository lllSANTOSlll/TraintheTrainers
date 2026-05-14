const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.use(isAuthenticated);
router.use(isAdmin);

// Get all settings
function getSettings(callback) {
  db.all('SELECT * FROM settings ORDER BY category, key', [], (err, rows) => {
    if (err) {
      callback(err, null);
      return;
    }
    
    const settings = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    callback(null, settings);
  });
}

// Settings page
router.get('/', (req, res) => {
  getSettings((err, settings) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur serveur');
    }
    
    res.render('admin/settings', {
      title: 'Paramètres',
      settings,
      message: req.query.message || null,
      error: req.query.error || null
    });
  });
});

// Update SharePoint settings
router.post('/sharepoint', (req, res) => {
  const {
    sharepoint_client_id,
    sharepoint_client_secret,
    sharepoint_tenant_id,
    sharepoint_site_url,
    sharepoint_list_name
  } = req.body;

  const updates = [
    { key: 'sharepoint_client_id', value: sharepoint_client_id || '' },
    { key: 'sharepoint_client_secret', value: sharepoint_client_secret || '' },
    { key: 'sharepoint_tenant_id', value: sharepoint_tenant_id || '' },
    { key: 'sharepoint_site_url', value: sharepoint_site_url || '' },
    { key: 'sharepoint_list_name', value: sharepoint_list_name || 'FormateursQualifies' }
  ];

  let completed = 0;
  const total = updates.length;

  updates.forEach(setting => {
    db.run(
      'INSERT OR REPLACE INTO settings (key, value, category, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [setting.key, setting.value, 'sharepoint'],
      (err) => {
        if (err) console.error(`Erreur mise à jour ${setting.key}:`, err);
        completed++;
        
        if (completed === total) {
          res.redirect('/admin/settings?message=Configuration SharePoint mise à jour');
        }
      }
    );
  });
});

// Update theme settings
router.post('/theme', (req, res) => {
  const {
    theme_primary_color,
    theme_sidebar_bg,
    theme_sidebar_hover,
    theme_success_color,
    theme_danger_color,
    theme_warning_color,
    theme_info_color
  } = req.body;

  const updates = [
    { key: 'theme_primary_color', value: theme_primary_color || '#0066cc' },
    { key: 'theme_sidebar_bg', value: theme_sidebar_bg || '#2c3e50' },
    { key: 'theme_sidebar_hover', value: theme_sidebar_hover || '#34495e' },
    { key: 'theme_success_color', value: theme_success_color || '#28a745' },
    { key: 'theme_danger_color', value: theme_danger_color || '#dc3545' },
    { key: 'theme_warning_color', value: theme_warning_color || '#ffc107' },
    { key: 'theme_info_color', value: theme_info_color || '#17a2b8' }
  ];

  let completed = 0;
  const total = updates.length;

  updates.forEach(setting => {
    db.run(
      'INSERT OR REPLACE INTO settings (key, value, category, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [setting.key, setting.value, 'theme'],
      (err) => {
        if (err) console.error(`Erreur mise à jour ${setting.key}:`, err);
        completed++;
        
        if (completed === total) {
          res.redirect('/admin/settings?message=Thème mis à jour');
        }
      }
    );
  });
});

// Reset to defaults
router.post('/reset', (req, res) => {
  const { category } = req.body;
  
  if (category === 'theme') {
    const defaults = [
      { key: 'theme_primary_color', value: '#0066cc' },
      { key: 'theme_sidebar_bg', value: '#2c3e50' },
      { key: 'theme_sidebar_hover', value: '#34495e' },
      { key: 'theme_success_color', value: '#28a745' },
      { key: 'theme_danger_color', value: '#dc3545' },
      { key: 'theme_warning_color', value: '#ffc107' },
      { key: 'theme_info_color', value: '#17a2b8' }
    ];
    
    let completed = 0;
    defaults.forEach(setting => {
      db.run(
        'UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
        [setting.value, setting.key],
        (err) => {
          if (err) console.error(err);
          completed++;
          if (completed === defaults.length) {
            res.redirect('/admin/settings?message=Thème réinitialisé');
          }
        }
      );
    });
  } else {
    res.redirect('/admin/settings?error=Catégorie invalide');
  }
});

// Get settings as JSON (for use in other routes)
router.get('/json', (req, res) => {
  getSettings((err, settings) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    res.json(settings);
  });
});

module.exports = router;
