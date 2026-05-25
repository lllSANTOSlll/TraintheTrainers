const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

router.use(isAuthenticated);

// New evaluation form
router.get('/new/:trainerId', (req, res) => {
  const trainerId = req.params.trainerId;
  
  db.get('SELECT * FROM trainers WHERE id = ?', [trainerId], (err, trainer) => {
    if (err || !trainer) {
      return res.status(404).send('Formateur non trouvé');
    }
    
    res.render('evaluations/form', {
      title: 'Nouvelle Évaluation',
      trainer,
      evaluation: null
    });
  });
});

// Create evaluation
router.post('/', (req, res) => {
  const {
    trainer_id, formation, evaluateur, date_evaluation,
    maitrise_technique, competences_pedagogiques, communication,
    standards_qualite, engagement_autonomie, capacite_adaptation,
    remarques_generales
  } = req.body;

  const sql = `INSERT INTO evaluations 
    (trainer_id, formation, evaluateur, date_evaluation, maitrise_technique,
     competences_pedagogiques, communication, standards_qualite, 
     engagement_autonomie, capacite_adaptation, remarques_generales)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(sql, [
    trainer_id, formation, evaluateur, date_evaluation,
    maitrise_technique, competences_pedagogiques, communication,
    standards_qualite, engagement_autonomie, capacite_adaptation,
    remarques_generales
  ], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur lors de la création');
    }
    res.redirect(`/trainers/${trainer_id}`);
  });
});

// View evaluation
router.get('/:id', (req, res) => {
  const sql = `SELECT e.*, t.nom_prenom 
               FROM evaluations e 
               JOIN trainers t ON e.trainer_id = t.id 
               WHERE e.id = ?`;
  
  db.get(sql, [req.params.id], (err, evaluation) => {
    if (err || !evaluation) {
      return res.status(404).send('Évaluation non trouvée');
    }
    
    res.render('evaluations/detail', {
      title: 'Détails de l\'Évaluation',
      evaluation
    });
  });
});

module.exports = router;
