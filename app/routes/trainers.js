const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, getDeptFilter } = require('../middleware/auth');

// All routes require authentication
router.use(isAuthenticated);

// List all trainers
router.get('/', (req, res) => {
  const dept = getDeptFilter(req);
  let sql = 'SELECT * FROM trainers';
  const params = [];
  if (dept !== null) { sql += ' WHERE department = ?'; params.push(dept); }
  sql += ' ORDER BY created_at DESC';

  db.all(sql, params, (err, trainers) => {
    if (err) { console.error(err); return res.status(500).send('Erreur serveur'); }
    res.render('trainers/list', { title: 'Liste des Formateurs', trainers });
  });
});

// New trainer form
router.get('/new', (req, res) => {
  res.render('trainers/form', {
    title: 'Nouveau Formateur',
    trainer: null,
    action: '/trainers',
    userDept: getDeptFilter(req) || ''
  });
});

// Create trainer
router.post('/', (req, res) => {
  const {
    nom_prenom, poste_actuel, departement, domaine_expertise,
    superviseur, commentaires, statut_validation
  } = req.body;
  const dept = getDeptFilter(req) || req.body.department || '';

  const sql = `INSERT INTO trainers
    (nom_prenom, poste_actuel, departement, domaine_expertise, superviseur,
     commentaires, statut_validation, created_by, department)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(sql, [
    nom_prenom, poste_actuel, departement, domaine_expertise,
    superviseur, commentaires, statut_validation || 'Non validé',
    req.session.user.id, dept
  ], function(err) {
    if (err) { console.error(err); return res.status(500).send('Erreur lors de la création'); }
    res.redirect('/trainers');
  });
});

// View trainer details
router.get('/:id', (req, res) => {
  const trainerId = req.params.id;
  
  const trainerSql = 'SELECT * FROM trainers WHERE id = ?';
  const evalsSql = 'SELECT * FROM evaluations WHERE trainer_id = ? ORDER BY date_evaluation DESC';
  const sessionsSql = 'SELECT * FROM training_sessions WHERE trainer_id = ? ORDER BY date_debut DESC';

  db.get(trainerSql, [trainerId], (err, trainer) => {
    if (err || !trainer) {
      return res.status(404).send('Formateur non trouvé');
    }

    db.all(evalsSql, [trainerId], (err, evaluations) => {
      db.all(sessionsSql, [trainerId], (err, sessions) => {
        res.render('trainers/detail', {
          title: trainer.nom_prenom,
          trainer,
          evaluations: evaluations || [],
          sessions: sessions || []
        });
      });
    });
  });
});

// Edit trainer form
router.get('/:id/edit', (req, res) => {
  const sql = 'SELECT * FROM trainers WHERE id = ?';
  
  db.get(sql, [req.params.id], (err, trainer) => {
    if (err || !trainer) {
      return res.status(404).send('Formateur non trouvé');
    }
    res.render('trainers/form', {
      title: 'Modifier Formateur',
      trainer,
      action: `/trainers/${trainer.id}?_method=PUT`,
      userDept: getDeptFilter(req) || ''
    });
  });
});

// Update trainer
router.put('/:id', (req, res) => {
  const { 
    nom_prenom, poste_actuel, departement, domaine_expertise, 
    superviseur, commentaires, statut_validation,
    date_formation, date_certification 
  } = req.body;

  const sql = `UPDATE trainers SET 
    nom_prenom = ?, poste_actuel = ?, departement = ?, domaine_expertise = ?,
    superviseur = ?, commentaires = ?, statut_validation = ?,
    date_formation = ?, date_certification = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`;

  db.run(sql, [
    nom_prenom, poste_actuel, departement, domaine_expertise,
    superviseur, commentaires, statut_validation,
    date_formation || null, date_certification || null,
    req.params.id
  ], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur lors de la mise à jour');
    }
    res.redirect(`/trainers/${req.params.id}`);
  });
});

// Delete trainer
router.delete('/:id', (req, res) => {
  const sql = 'DELETE FROM trainers WHERE id = ?';
  
  db.run(sql, [req.params.id], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur lors de la suppression');
    }
    res.redirect('/trainers');
  });
});

module.exports = router;
