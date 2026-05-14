const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const axios = require('axios');
const { getSettings } = require('./settings');

router.use(isAuthenticated);

// SharePoint authentication helper
async function getSharePointAccessToken() {
  return new Promise((resolve, reject) => {
    getSettings((err, settings) => {
      if (err) {
        reject(new Error('Erreur de lecture des paramètres'));
        return;
      }

      const clientId = settings.sharepoint_client_id;
      const clientSecret = settings.sharepoint_client_secret;
      const tenantId = settings.sharepoint_tenant_id;

      if (!clientId || !clientSecret || !tenantId) {
        reject(new Error('Configuration SharePoint incomplète. Configurez les paramètres dans Admin > Paramètres'));
        return;
      }

      const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
      
      const params = new URLSearchParams();
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('scope', 'https://graph.microsoft.com/.default');
      params.append('grant_type', 'client_credentials');

      axios.post(tokenUrl, params)
        .then(response => resolve(response.data.access_token))
        .catch(error => reject(error));
    });
  });
}

// Export to Excel
router.get('/export/excel', async (req, res) => {
  try {
    const trainers = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM trainers ORDER BY nom_prenom', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Formateurs');

    // Headers
    worksheet.columns = [
      { header: 'Nom et Prénom', key: 'nom_prenom', width: 25 },
      { header: 'Poste actuel', key: 'poste_actuel', width: 20 },
      { header: 'Département', key: 'departement', width: 20 },
      { header: "Domaine d'expertise", key: 'domaine_expertise', width: 25 },
      { header: 'Statut', key: 'statut_validation', width: 15 },
      { header: 'Date formation', key: 'date_formation', width: 15 },
      { header: 'Date certification', key: 'date_certification', width: 15 },
      { header: 'Superviseur', key: 'superviseur', width: 20 },
      { header: 'Commentaires', key: 'commentaires', width: 30 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

    // Add data
    trainers.forEach(trainer => {
      worksheet.addRow(trainer);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=formateurs.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Erreur export Excel:', err);
    res.status(500).send('Erreur lors de l\'export');
  }
});

// Import from Excel
router.post('/import/excel', isAdmin, async (req, res) => {
  // This would handle file upload and import
  // Implementation depends on multer setup for file handling
  res.status(501).send('Import Excel - À implémenter avec multer');
});

// Export to SharePoint
router.post('/export/sharepoint', isAdmin, async (req, res) => {
  try {
    const settings = await new Promise((resolve, reject) => {
      getSettings((err, s) => {
        if (err) reject(err);
        else resolve(s);
      });
    });

    const siteUrl = settings.sharepoint_site_url;
    const listName = settings.sharepoint_list_name;

    if (!siteUrl || !listName) {
      throw new Error('Configuration SharePoint incomplète. Veuillez configurer dans Admin > Paramètres');
    }

    const accessToken = await getSharePointAccessToken();

    const trainers = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM trainers', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get site ID
    const siteResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/sites/${siteUrl.replace('https://', '')}:/`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const siteId = siteResponse.data.id;

    // Get list ID
    const listResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists?$filter=displayName eq '${listName}'`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (listResponse.data.value.length === 0) {
      throw new Error(`Liste SharePoint "${listName}" non trouvée`);
    }

    const listId = listResponse.data.value[0].id;

    // Add items to SharePoint list
    let successCount = 0;
    for (const trainer of trainers) {
      const itemData = {
        fields: {
          Title: trainer.nom_prenom,
          PosteActuel: trainer.poste_actuel,
          Departement: trainer.departement,
          DomaineExpertise: trainer.domaine_expertise,
          StatutValidation: trainer.statut_validation,
          DateFormation: trainer.date_formation,
          DateCertification: trainer.date_certification,
          Superviseur: trainer.superviseur,
          Commentaires: trainer.commentaires
        }
      };

      try {
        await axios.post(
          `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items`,
          itemData,
          { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
        );
        successCount++;
      } catch (itemErr) {
        console.error(`Erreur pour ${trainer.nom_prenom}:`, itemErr.message);
      }
    }

    res.json({
      success: true,
      message: `${successCount} formateur(s) exporté(s) vers SharePoint`,
      total: trainers.length
    });

  } catch (err) {
    console.error('Erreur export SharePoint:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de l\'export vers SharePoint'
    });
  }
});

// Import from SharePoint
router.post('/import/sharepoint', isAdmin, async (req, res) => {
  try {
    const settings = await new Promise((resolve, reject) => {
      getSettings((err, s) => {
        if (err) reject(err);
        else resolve(s);
      });
    });

    const siteUrl = settings.sharepoint_site_url;
    const listName = settings.sharepoint_list_name;

    if (!siteUrl || !listName) {
      throw new Error('Configuration SharePoint incomplète. Veuillez configurer dans Admin > Paramètres');
    }

    const accessToken = await getSharePointAccessToken();

    // Get site and list IDs (same as export)
    const siteResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/sites/${siteUrl.replace('https://', '')}:/`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const siteId = siteResponse.data.id;

    const listResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists?$filter=displayName eq '${listName}'`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const listId = listResponse.data.value[0].id;

    // Get items from SharePoint
    const itemsResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?$expand=fields`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    let importCount = 0;
    for (const item of itemsResponse.data.value) {
      const fields = item.fields;
      
      const sql = `INSERT INTO trainers 
        (nom_prenom, poste_actuel, departement, domaine_expertise, statut_validation,
         date_formation, date_certification, superviseur, commentaires, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      await new Promise((resolve, reject) => {
        db.run(sql, [
          fields.Title,
          fields.PosteActuel,
          fields.Departement,
          fields.DomaineExpertise,
          fields.StatutValidation,
          fields.DateFormation,
          fields.DateCertification,
          fields.Superviseur,
          fields.Commentaires,
          req.session.user.id
        ], (err) => {
          if (err) reject(err);
          else {
            importCount++;
            resolve();
          }
        });
      });
    }

    res.json({
      success: true,
      message: `${importCount} formateur(s) importé(s) depuis SharePoint`
    });

  } catch (err) {
    console.error('Erreur import SharePoint:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de l\'import depuis SharePoint'
    });
  }
});

// SharePoint sync page
router.get('/sync', isAdmin, (req, res) => {
  res.render('sharepoint/sync', {
    title: 'Synchronisation SharePoint',
    message: req.query.message || null
  });
});

module.exports = router;
