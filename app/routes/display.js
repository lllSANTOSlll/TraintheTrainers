const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// ── Upload config ─────────────────────────────────────────
const imgDir = path.join(__dirname, '../public/uploads/stations');
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

const imgStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(imgDir, String(req.params.id || 'tmp'));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'img-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + ext);
  }
});
const imgUpload = multer({
  storage: imgStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp|jfif)$/.test(file.mimetype) || file.originalname.match(/\.jfif$/i))
      cb(null, true);
    else cb(new Error('Images uniquement'));
  }
});

// ── KIOSK — public (no login required) ───────────────────

// Scan input page (kiosk)
router.get('/scan', (req, res) => {
  res.render('display/scan', { title: 'Scanner' });
});

// Full-screen station display (kiosk)
router.get('/show/:code', (req, res) => {
  const code = req.params.code.trim();
  db.get('SELECT * FROM station_displays WHERE station_code = ?', [code], (err, station) => {
    if (err || !station) {
      return res.render('display/scan', {
        title: 'Scanner',
        error: `Station inconnue : "${code}"`
      });
    }
    db.all(
      'SELECT * FROM station_display_images WHERE station_id = ? ORDER BY ordre, id',
      [station.id],
      (err2, images) => {
        res.render('display/show', {
          title: station.label || station.station_code,
          station,
          images: images || []
        });
      }
    );
  });
});

// API — return station URL for a given code (used by scan page to open DOMO)
router.get('/api/:code', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  db.get('SELECT url FROM station_displays WHERE station_code = ?', [code], (err, row) => {
    if (err || !row) return res.json({ url: null });
    res.json({ url: row.url || null });
  });
});

// ── ADMIN — requires login ────────────────────────────────
router.use(isAuthenticated);

// List all stations
router.get('/', (req, res) => {
  db.all(
    `SELECT s.*, COUNT(i.id) as img_count
     FROM station_displays s
     LEFT JOIN station_display_images i ON i.station_id = s.id
     GROUP BY s.id ORDER BY s.station_code`,
    [],
    (err, stations) => {
      res.render('display/admin', {
        title: 'Stations Display',
        stations: stations || []
      });
    }
  );
});

// New station form
router.get('/new', (req, res) => {
  res.render('display/form', { title: 'Nouvelle Station', station: null, images: [], action: '/display' });
});

// Create station
router.post('/', (req, res) => {
  const { station_code, label, url, carousel_interval } = req.body;
  db.run(
    'INSERT INTO station_displays (station_code, label, url, carousel_interval) VALUES (?,?,?,?)',
    [station_code.trim().toUpperCase(), label || '', url || '', parseInt(carousel_interval) || 10],
    function(err) {
      if (err) return res.status(500).send('Erreur: ' + err.message);
      res.redirect('/display/' + this.lastID + '/edit');
    }
  );
});

// Edit station form
router.get('/:id/edit', (req, res) => {
  db.get('SELECT * FROM station_displays WHERE id = ?', [req.params.id], (err, station) => {
    if (!station) return res.status(404).send('Non trouvée');
    db.all('SELECT * FROM station_display_images WHERE station_id = ? ORDER BY ordre, id',
      [req.params.id], (err2, images) => {
        res.render('display/form', {
          title: 'Modifier Station',
          station,
          images: images || [],
          action: `/display/${station.id}?_method=PUT`
        });
      }
    );
  });
});

// Update station
router.put('/:id', (req, res) => {
  const { station_code, label, url, carousel_interval } = req.body;
  db.run(
    `UPDATE station_displays SET station_code=?, label=?, url=?, carousel_interval=?,
     updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [station_code.trim().toUpperCase(), label || '', url || '',
     parseInt(carousel_interval) || 10, req.params.id],
    (err) => {
      if (err) return res.status(500).send('Erreur');
      res.redirect('/display/' + req.params.id + '/edit');
    }
  );
});

// Delete station
router.post('/:id/delete', (req, res) => {
  db.get('SELECT * FROM station_displays WHERE id = ?', [req.params.id], (err, station) => {
    if (!station) return res.redirect('/display');
    // Remove image folder
    const dir = path.join(imgDir, String(station.id));
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    db.run('DELETE FROM station_displays WHERE id = ?', [station.id], () => res.redirect('/display'));
  });
});

// Upload images to a station
router.post('/:id/images', imgUpload.array('images', 50), (req, res) => {
  if (!req.files || req.files.length === 0) return res.redirect('/display/' + req.params.id + '/edit');
  const stationId = req.params.id;
  let done = 0;
  req.files.forEach((file, idx) => {
    db.run(
      'INSERT INTO station_display_images (station_id, filename, original_name, ordre) VALUES (?,?,?,?)',
      [stationId, '/uploads/stations/' + stationId + '/' + file.filename, file.originalname, idx],
      () => { done++; if (done === req.files.length) res.redirect('/display/' + stationId + '/edit#images'); }
    );
  });
});

// Reorder images (AJAX)
router.post('/:id/images/reorder', (req, res) => {
  const { order } = req.body; // array of image IDs in new order
  if (!Array.isArray(order)) return res.json({ success: false });
  let done = 0;
  order.forEach((imgId, idx) => {
    db.run('UPDATE station_display_images SET ordre = ? WHERE id = ? AND station_id = ?',
      [idx, imgId, req.params.id],
      () => { done++; if (done === order.length) res.json({ success: true }); }
    );
  });
});

// Delete image
router.post('/:id/images/:imgId/delete', (req, res) => {
  db.get('SELECT * FROM station_display_images WHERE id = ? AND station_id = ?',
    [req.params.imgId, req.params.id],
    (err, img) => {
      if (!img) return res.redirect('/display/' + req.params.id + '/edit');
      const filePath = path.join(__dirname, '../public', img.filename);
      if (fs.existsSync(filePath)) fs.unlink(filePath, () => {});
      db.run('DELETE FROM station_display_images WHERE id = ?', [img.id],
        () => res.redirect('/display/' + req.params.id + '/edit#images')
      );
    }
  );
});

module.exports = router;
