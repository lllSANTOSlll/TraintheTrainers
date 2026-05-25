const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const axios = require('axios');
const { getSettings } = require('./settings.js');

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
        .catch(error => {
          const detail = error.response ? JSON.stringify(error.response.data) : error.message;
          reject(new Error('Token error: ' + detail));
        });
    });
  });
}

function styleHeader(worksheet, argb) {
  const row = worksheet.getRow(1);
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb || 'FF4472C4' } };
  row.alignment = { vertical: 'middle' };
}

function addAlertRow(ws, cols, data, color) {
  const row = ws.addRow(data);
  if (color) {
    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    });
  }
  return row;
}

// Export to Excel — multi-sheet workbook
router.get('/export/excel', async (req, res) => {
  try {
    const query = (sql, params) => new Promise((resolve, reject) =>
      db.all(sql, params || [], (err, rows) => err ? reject(err) : resolve(rows))
    );

    const [trainers, employees, sessions] = await Promise.all([
      query('SELECT * FROM trainers ORDER BY nom_prenom'),
      query('SELECT * FROM employees WHERE statut = ? OR statut IS NULL ORDER BY nom', ['Actif']),
      query(`SELECT ts.*, t.nom_prenom as formateur_nom, t.department as formateur_dept
             FROM training_sessions ts
             LEFT JOIN trainers t ON t.id = ts.trainer_id
             ORDER BY ts.date_debut DESC`)
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Train the Trainers';
    workbook.created = new Date();

    const DEPTS = ['Operations', 'Technicians', 'Logistics'];
    const DEPT_COLORS = { Operations: 'FF4472C4', Technicians: 'FF70AD47', Logistics: 'FFED7D31' };

    // ── Per-department employee sheets ──────────────────────────────
    for (const dept of DEPTS) {
      const deptEmployees = employees.filter(e => e.department === dept);
      const ws = workbook.addWorksheet(dept);
      ws.columns = [
        { header: 'Nom', key: 'nom', width: 25 },
        { header: 'Équipe', key: 'equipe', width: 12 },
        { header: 'Shift', key: 'shift', width: 10 },
        { header: 'Poste', key: 'poste', width: 20 },
        { header: 'Date embauche', key: 'date_embauche', width: 15 },
        { header: 'Statut', key: 'statut', width: 12 },
        { header: 'Stations formées', key: 'nb_stations', width: 16 },
        { header: 'Sessions de formation', key: 'sessions', width: 35 },
        { header: 'Dernière session', key: 'last_session', width: 16 },
        { header: 'Statut session', key: 'session_statut', width: 16 }
      ];
      styleHeader(ws, DEPT_COLORS[dept]);

      deptEmployees.forEach(emp => {
        const empSessions = sessions.filter(s =>
          s.employee_name && s.employee_name.trim().toLowerCase() === emp.nom.trim().toLowerCase()
        );
        const lastSession = empSessions[0];
        ws.addRow({
          nom: emp.nom,
          equipe: emp.equipe,
          shift: emp.shift,
          poste: emp.poste,
          date_embauche: emp.date_embauche,
          statut: emp.statut,
          nb_stations: emp.nb_stations || 0,
          sessions: empSessions.map(s => s.poste || '').filter(Boolean).join(', ') || '—',
          last_session: lastSession ? lastSession.date_debut : '—',
          session_statut: lastSession ? lastSession.statut : 'Aucune'
        });
      });

      // Totals row
      ws.addRow([]);
      const totalRow = ws.addRow({ nom: `Total: ${deptEmployees.length} employé(s)` });
      totalRow.font = { bold: true };
    }

    // ── Sessions de Formation sheet ─────────────────────────────────
    const wsSessions = workbook.addWorksheet('Sessions de Formation');
    wsSessions.columns = [
      { header: 'Employé', key: 'employee_name', width: 25 },
      { header: 'Formateur', key: 'formateur_nom', width: 25 },
      { header: 'Département', key: 'formateur_dept', width: 15 },
      { header: 'Poste formé', key: 'poste', width: 20 },
      { header: 'Date début', key: 'date_debut', width: 14 },
      { header: 'Date fin', key: 'date_fin', width: 14 },
      { header: 'Statut', key: 'statut', width: 15 },
      { header: 'Notes', key: 'notes', width: 35 }
    ];
    styleHeader(wsSessions, 'FF7030A0');
    sessions.forEach(s => wsSessions.addRow(s));

    // ── Formateurs sheet ────────────────────────────────────────────
    const wsTrainers = workbook.addWorksheet('Formateurs');
    wsTrainers.columns = [
      { header: 'Nom et Prénom', key: 'nom_prenom', width: 25 },
      { header: 'Département', key: 'department', width: 15 },
      { header: 'Poste actuel', key: 'poste_actuel', width: 20 },
      { header: "Domaine d'expertise", key: 'domaine_expertise', width: 25 },
      { header: 'Statut', key: 'statut_validation', width: 15 },
      { header: 'Date formation', key: 'date_formation', width: 15 },
      { header: 'Date certification', key: 'date_certification', width: 15 },
      { header: 'Superviseur', key: 'superviseur', width: 20 },
      { header: 'Commentaires', key: 'commentaires', width: 30 }
    ];
    styleHeader(wsTrainers, 'FF4472C4');
    trainers.forEach(t => wsTrainers.addRow(t));

    // ── Alertes sheet ───────────────────────────────────────────────
    const wsAlerts = workbook.addWorksheet('Alertes');
    wsAlerts.columns = [
      { header: 'Type', key: 'type', width: 28 },
      { header: 'Nom', key: 'nom', width: 28 },
      { header: 'Département', key: 'dept', width: 16 },
      { header: 'Détail', key: 'detail', width: 40 },
      { header: 'Date', key: 'date', width: 16 }
    ];
    styleHeader(wsAlerts, 'FFFF0000');

    const today = new Date();
    const dayMs = 86400000;

    // Alert: employees with no training sessions
    employees.forEach(emp => {
      const empSessions = sessions.filter(s =>
        s.employee_name && s.employee_name.trim().toLowerCase() === emp.nom.trim().toLowerCase()
      );
      if (empSessions.length === 0) {
        addAlertRow(wsAlerts, null, {
          type: 'Aucune session de formation',
          nom: emp.nom,
          dept: emp.department || '—',
          detail: `Employé sans aucune session enregistrée`,
          date: emp.date_embauche || '—'
        }, 'FFFFF2CC');
      }
    });

    // Alert: sessions "En cours" for more than 30 days
    sessions.forEach(s => {
      if (s.statut === 'En cours' && s.date_debut) {
        const start = new Date(s.date_debut);
        const days = Math.floor((today - start) / dayMs);
        if (days > 30) {
          addAlertRow(wsAlerts, null, {
            type: 'Session en cours > 30 jours',
            nom: s.employee_name,
            dept: s.formateur_dept || '—',
            detail: `Formateur: ${s.formateur_nom || '—'} — Poste: ${s.poste || '—'}`,
            date: s.date_debut
          }, 'FFFCE4D6');
        }
      }
    });

    // Alert: trainer certifications expiring within 90 days
    trainers.forEach(t => {
      if (t.date_certification) {
        const certDate = new Date(t.date_certification);
        const daysLeft = Math.floor((certDate - today) / dayMs);
        if (daysLeft >= 0 && daysLeft <= 90) {
          addAlertRow(wsAlerts, null, {
            type: 'Certification expire bientôt',
            nom: t.nom_prenom,
            dept: t.department || t.departement || '—',
            detail: `Expire dans ${daysLeft} jour(s)`,
            date: t.date_certification
          }, 'FFFCE4D6');
        } else if (daysLeft < 0) {
          addAlertRow(wsAlerts, null, {
            type: 'Certification expirée',
            nom: t.nom_prenom,
            dept: t.department || t.departement || '—',
            detail: `Expirée depuis ${Math.abs(daysLeft)} jour(s)`,
            date: t.date_certification
          }, 'FFFFC7CE');
        }
      }
    });

    if (wsAlerts.rowCount <= 1) {
      wsAlerts.addRow({ type: 'Aucune alerte', nom: '', dept: '', detail: 'Tout est en ordre', date: '' });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=train-the-trainers-${today.toISOString().slice(0,10)}.xlsx`);

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
    let siteResponse;
    try {
      const parsedUrl = new URL(siteUrl);
      const graphSiteEndpoint = `https://graph.microsoft.com/v1.0/sites/${parsedUrl.hostname}:${parsedUrl.pathname}`;
      siteResponse = await axios.get(graphSiteEndpoint, { headers: { Authorization: `Bearer ${accessToken}` } });
    } catch (siteErr) {
      const detail = siteErr.response ? JSON.stringify(siteErr.response.data) : siteErr.message;
      throw new Error(`Erreur accès site SharePoint: ${detail}`);
    }

    const siteId = siteResponse.data.id;

    // Get list ID
    let listResponse;
    try {
      listResponse = await axios.get(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists?$filter=displayName eq '${listName}'`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    } catch (listErr) {
      const detail = listErr.response ? JSON.stringify(listErr.response.data) : listErr.message;
      throw new Error(`Erreur accès liste SharePoint: ${detail}`);
    }

    if (listResponse.data.value.length === 0) {
      throw new Error(`Liste SharePoint "${listName}" non trouvée. Listes disponibles: vérifiez le nom exact.`);
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
    const parsedUrl = new URL(siteUrl);
    const siteResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/sites/${parsedUrl.hostname}:${parsedUrl.pathname}`,
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

// Test token + site access debug
router.get('/test-token', isAdmin, async (req, res) => {
  const result = { steps: {} };
  try {
    const settings = await new Promise((resolve, reject) => {
      getSettings((err, s) => { if (err) reject(err); else resolve(s); });
    });
    const { sharepoint_client_id: clientId, sharepoint_client_secret: clientSecret, sharepoint_tenant_id: tenantId, sharepoint_site_url: siteUrl } = settings;

    // Step 1: get token
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('grant_type', 'client_credentials');
    const tokenRes = await axios.post(tokenUrl, params);
    const token = tokenRes.data.access_token;
    result.steps.token = { ok: true, expires_in: tokenRes.data.expires_in };

    const headers = { Authorization: `Bearer ${token}` };

    // Step 2: access root site
    try {
      const parsedUrl = new URL(siteUrl);
      const rootRes = await axios.get(`https://graph.microsoft.com/v1.0/sites/${parsedUrl.hostname}`, { headers });
      result.steps.root_site = { ok: true, id: rootRes.data.id, name: rootRes.data.displayName };
    } catch (e) {
      result.steps.root_site = { ok: false, status: e.response?.status, error: e.response?.data };
    }

    // Step 3: access specific site
    try {
      const parsedUrl = new URL(siteUrl);
      const siteRes = await axios.get(`https://graph.microsoft.com/v1.0/sites/${parsedUrl.hostname}:${parsedUrl.pathname}`, { headers });
      result.steps.specific_site = { ok: true, id: siteRes.data.id, name: siteRes.data.displayName };
    } catch (e) {
      result.steps.specific_site = { ok: false, status: e.response?.status, error: e.response?.data };
    }

    // Step 4: search all sites
    try {
      const searchRes = await axios.get(`https://graph.microsoft.com/v1.0/sites?search=*`, { headers });
      result.steps.sites_search = { ok: true, count: searchRes.data.value.length, sites: searchRes.data.value.map(s => ({ name: s.displayName, url: s.webUrl })) };
    } catch (e) {
      result.steps.sites_search = { ok: false, status: e.response?.status, error: e.response?.data };
    }

    res.json(result);
  } catch (err) {
    result.error = { status: err.response?.status, azure_error: err.response?.data, message: err.message };
    res.json(result);
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
