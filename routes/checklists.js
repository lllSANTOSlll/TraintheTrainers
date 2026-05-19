const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, isAdmin, isSupervisorOrAdmin, getDeptFilter } = require('../middleware/auth');
const multer = require('multer');
const mammoth = require('mammoth');
const path = require('path');
const fs = require('fs');

// Setup file upload
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.originalname.endsWith('.docx')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers .docx sont acceptés'));
    }
  }
});

router.use(isAuthenticated);

// List all templates
router.get('/', (req, res) => {
  const dept = getDeptFilter(req);
  let sql = `SELECT t.*,
    (SELECT COUNT(*) FROM checklist_template_items WHERE template_id = t.id) as item_count
    FROM checklist_templates t`;
  const params = [];
  if (dept !== null) { sql += ' WHERE t.department = ?'; params.push(dept); }
  sql += ' ORDER BY t.created_at DESC';

  db.all(sql, params, (err, templates) => {
    if (err) { console.error(err); return res.status(500).send('Erreur serveur'); }
    res.render('checklists/list', {
      title: 'Modèles de Checklist',
      templates: templates || [],
      message: req.query.message
    });
  });
});

// New template form
router.get('/new', isSupervisorOrAdmin, (req, res) => {
  res.render('checklists/form', { 
    title: 'Nouveau Modèle', 
    template: null,
    action: '/checklists'
  });
});

// Create template
router.post('/', isSupervisorOrAdmin, (req, res) => {
  const { title, description } = req.body;
  const dept = getDeptFilter(req) || '';

  db.run('INSERT INTO checklist_templates (title, description, created_by, department) VALUES (?, ?, ?, ?)',
    [title, description, req.session.user.id, dept],
    function(err) {
      if (err) { console.error(err); return res.status(500).send('Erreur'); }
      res.redirect('/checklists/' + this.lastID + '/items?message=Modele cree');
    }
  );
});

// Edit template form
router.get('/:id/edit', isSupervisorOrAdmin, (req, res) => {
  db.get('SELECT * FROM checklist_templates WHERE id = ?', [req.params.id], (err, template) => {
    if (err || !template) return res.status(404).send('Non trouve');
    res.render('checklists/form', {
      title: 'Modifier',
      template,
      action: '/checklists/' + template.id + '?_method=PUT'
    });
  });
});

// Update template
router.put('/:id', isSupervisorOrAdmin, (req, res) => {
  const { title, description, department } = req.body;
  const dept = req.session.user.role === 'admin'
    ? (department || '')
    : (getDeptFilter(req) || '');
  db.run('UPDATE checklist_templates SET title=?, description=?, department=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [title, description, dept, req.params.id],
    () => res.redirect('/checklists/' + req.params.id + '/items?message=Mis a jour')
  );
});

// Delete template
router.delete('/:id', isAdmin, (req, res) => {
  db.run('DELETE FROM checklist_template_items WHERE template_id = ?', [req.params.id], () => {
    db.run('DELETE FROM checklist_templates WHERE id = ?', [req.params.id], () => {
      res.redirect('/checklists?message=Supprime');
    });
  });
});

// Manage items
router.get('/:id/items', isSupervisorOrAdmin, (req, res) => {
  db.get('SELECT * FROM checklist_templates WHERE id = ?', [req.params.id], (err, template) => {
    if (!template) return res.status(404).send('Non trouve');
    db.all('SELECT * FROM checklist_template_items WHERE template_id = ? ORDER BY ordre, jour',
      [req.params.id],
      (err, items) => {
        res.render('checklists/items', {
          title: 'Gerer - ' + template.title,
          template,
          items: items || [],
          message: req.query.message
        });
      }
    );
  });
});

// Add item (AJAX)
router.post('/:id/items', isSupervisorOrAdmin, (req, res) => {
  const { jour, categorie, sous_categorie, quoi_expliquer } = req.body;
  
  db.get('SELECT MAX(ordre) as max FROM checklist_template_items WHERE template_id = ?',
    [req.params.id],
    (err, row) => {
      const ordre = (row && row.max) ? row.max + 1 : 1;
      
      db.run('INSERT INTO checklist_template_items (template_id, jour, categorie, sous_categorie, quoi_expliquer, ordre) VALUES (?, ?, ?, ?, ?, ?)',
        [req.params.id, jour, categorie, sous_categorie, quoi_expliquer, ordre],
        function(err) {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erreur' });
          }
          res.json({ success: true, id: this.lastID });
        }
      );
    }
  );
});

// Edit item (AJAX)
router.post('/:id/items/:itemId/edit', isSupervisorOrAdmin, (req, res) => {
  const { jour, categorie, sous_categorie, quoi_expliquer } = req.body;
  
  const sql = `UPDATE checklist_template_items 
               SET jour = ?, categorie = ?, sous_categorie = ?, quoi_expliquer = ?
               WHERE id = ?`;
  
  db.run(sql, [jour, categorie, sous_categorie, quoi_expliquer, req.params.itemId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erreur' });
    }
    res.json({ success: true });
  });
});

// Delete item (AJAX)
router.delete('/:id/items/:itemId', isSupervisorOrAdmin, (req, res) => {
  db.run('DELETE FROM checklist_template_items WHERE id = ?', [req.params.itemId], (err) => {
    res.json({ success: !err });
  });
});

// Download Word template
router.get('/template-download', isSupervisorOrAdmin, (req, res) => {
  const templatePath = path.join(__dirname, '../templates/Template_Checklist_Formation.docx');
  if (fs.existsSync(templatePath)) {
    res.download(templatePath, 'Template_Checklist_Formation.docx');
  } else {
    res.status(404).send('Template non trouvé');
  }
});

// Show import form
router.get('/import', isSupervisorOrAdmin, (req, res) => {
  res.render('checklists/import', {
    title: 'Importer une Checklist',
    error: req.query.error,
    message: req.query.message
  });
});

// Process Word document import
router.post('/import', isSupervisorOrAdmin, upload.single('docfile'), async (req, res) => {
  if (!req.file) {
    return res.redirect('/checklists/import?error=Aucun fichier sélectionné');
  }

  const { template_title, template_description } = req.body;
  
  if (!template_title) {
    fs.unlinkSync(req.file.path);
    return res.redirect('/checklists/import?error=Le titre du modèle est requis');
  }

  try {
    // Extract content from Word document
    const result = await mammoth.convertToHtml({ path: req.file.path });
    const html = result.value;
    
    // Parse the HTML to find table rows
    // Match table rows
    const tableRowRegex = /<tr>([\s\S]*?)<\/tr>/g;
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g;
    
    const rows = [];
    let rowMatch;
    
    while ((rowMatch = tableRowRegex.exec(html)) !== null) {
      const rowHtml = rowMatch[1];
      const cells = [];
      let cellMatch;
      
      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        // Strip HTML tags and clean text
        let cellText = cellMatch[1]
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&#x2019;/g, "'")
          .replace(/&#x201C;/g, '"')
          .replace(/&#x201D;/g, '"')
          .trim();
        cells.push(cellText);
      }
      
      if (cells.length >= 4) {
        rows.push(cells);
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    if (rows.length === 0) {
      return res.redirect('/checklists/import?error=Aucun tableau trouvé dans le document. Assurez-vous d\'utiliser le template fourni.');
    }

    // Filter out header row and empty rows
    const dataRows = rows.filter((row, idx) => {
      // Skip header row (usually contains "Jour" or "Day")
      if (idx === 0 && (row[0].toLowerCase().includes('jour') || row[0].toLowerCase().includes('day'))) {
        return false;
      }
      // Skip empty rows
      const jourValue = row[0].trim();
      const quoiValue = row[3].trim();
      return jourValue !== '' && quoiValue !== '' && !isNaN(parseInt(jourValue));
    });

    if (dataRows.length === 0) {
      return res.redirect('/checklists/import?error=Aucune donnée valide trouvée dans le tableau');
    }

    // Create the template
    const dept = getDeptFilter(req) || '';
    db.run('INSERT INTO checklist_templates (title, description, created_by, department) VALUES (?, ?, ?, ?)',
      [template_title, template_description || '', req.session.user.id, dept],
      function(err) {
        if (err) {
          console.error(err);
          return res.redirect('/checklists/import?error=Erreur lors de la création du modèle');
        }
        
        const templateId = this.lastID;
        let added = 0;
        let totalToAdd = dataRows.length;
        
        dataRows.forEach((row, idx) => {
          const jour = parseInt(row[0]) || 1;
          const categorie = row[1] || '';
          const sous_categorie = row[2] || '';
          const quoi_expliquer = row[3] || '';
          
          db.run(
            'INSERT INTO checklist_template_items (template_id, jour, categorie, sous_categorie, quoi_expliquer, ordre) VALUES (?, ?, ?, ?, ?, ?)',
            [templateId, jour, categorie, sous_categorie, quoi_expliquer, idx + 1],
            (err) => {
              if (err) console.error('Error inserting item:', err);
              added++;
              if (added === totalToAdd) {
                res.redirect(`/checklists/${templateId}/items?message=${added} éléments importés avec succès!`);
              }
            }
          );
        });
      }
    );

  } catch (error) {
    console.error('Import error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.redirect('/checklists/import?error=Erreur lors de la lecture du document: ' + error.message);
  }
});

module.exports = router;
