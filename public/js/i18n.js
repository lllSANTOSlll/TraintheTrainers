(function () {
  'use strict';

  // ── Translation dictionaries (FR is the base language) ──────────────
  const DICT = {
    en: {
      // ── Sidebar navigation ──
      'Tableau de bord': 'Dashboard',
      'Opérations': 'Operations',
      'Employés': 'Employees',
      'Matrice de formation': 'Training Matrix',
      'Planification': 'Planning',
      'Stations Display': 'Display Stations',
      'Formateurs': 'Trainers',
      'Sessions': 'Sessions',
      'Checklists': 'Checklists',
      'Administration': 'Administration',
      'Utilisateurs': 'Users',
      'Paramètres': 'Settings',
      'SharePoint / Export': 'SharePoint / Export',
      // ── Top navbar ──
      'Tous les départements': 'All Departments',
      'Techniciens': 'Technicians',
      'Logistique': 'Logistics',
      'Déconnexion': 'Logout',
      // ── Table headers ──
      'Nom et Prénom': 'Full Name',
      'Département': 'Department',
      "Domaine d'expertise": 'Expertise Area',
      'Date début': 'Start Date',
      'Date fin prévue': 'Expected End Date',
      'Statut': 'Status',
      'Actions': 'Actions',
      'Station': 'Station',
      'Formés': 'Trained',
      'Progression': 'Progress',
      'Employé': 'Employee',
      'Formateur': 'Trainer',
      'Superviseur': 'Supervisor',
      'Poste': 'Position',
      'Shift': 'Shift',
      'Total': 'Total',
      // ── Buttons ──
      'Nouveau Formateur': 'New Trainer',
      'Nouvelle Session': 'New Session',
      'Modifier': 'Edit',
      'Supprimer': 'Delete',
      'Retour': 'Back',
      'Enregistrer': 'Save',
      'Annuler': 'Cancel',
      'Importer CSV': 'Import CSV',
      'Voir': 'View',
      'Exporter': 'Export',
      // ── Filters / dropdowns ──
      'Tous les statuts': 'All Statuses',
      'Tous les shifts': 'All Shifts',
      'Tous les postes': 'All Positions',
      'Tous': 'All',
      'Actifs': 'Active',
      'Inactifs': 'Inactive',
      'Rechercher…': 'Search…',
      // ── Status badges ──
      'En cours': 'In Progress',
      'Terminée': 'Completed',
      'En retard': 'Late',
      'Actif': 'Active',
      'Inactif': 'Inactive',
      'Validé': 'Validated',
      'Non validé': 'Not Validated',
      // ── Matrix page ──
      'Légende :': 'Legend:',
      'Formé ✓': 'Trained ✓',
      'En formation ⚡': 'In Training ⚡',
      'Non formé': 'Not Trained',
      'Couverture par station': 'Station Coverage',
      'À revoir': 'To Review',
      'En formation': 'In Training',
      // ── Employee profile ──
      'Statut par station': 'Status by Station',
      'Pièces jointes': 'Attachments',
      'Profil personnel': 'Personal Profile',
      'Contact': 'Contact',
      'Informations générales': 'General Information',
      'Formé(es)': 'Trained',
      'Ancienneté': 'Seniority',
      'Embauche': 'Hire date',
      'Naissance': 'Birth date',
      'Restriction': 'Restriction',
      'Passion': 'Passion',
      'Ambition': 'Ambition',
      'Préoccupation': 'Concern',
      // ── Training session ──
      'Session de Formation': 'Training Session',
      'Sessions de Formation': 'Training Sessions',
      'Liste des Formateurs': 'Trainers List',
      'Informations': 'Information',
      'Progression de la Formation': 'Training Progress',
      'Période': 'Period',
      'Début:': 'Start:',
      'Fin prévue:': 'Expected End:',
      'Notes': 'Notes',
      'de retard': 'late',
      'jour': 'day',
      'jours': 'days',
      // ── Dashboard ──
      'Formateurs Validés': 'Validated Trainers',
      'Employés en Formation': 'Employees in Training',
      'Sessions Actives': 'Active Sessions',
      'Activité Récente': 'Recent Activity',
      // ── Empty states ──
      'Aucun formateur enregistré': 'No trainers registered',
      'Aucune session enregistrée': 'No sessions recorded',
      'Aucune session ne vous est assignée pour le moment': 'No sessions are assigned to you at the moment',
      'Aucun employé trouvé. Importez vos employés d\'abord.': 'No employees found. Import your employees first.',
      // ── Misc ──
      'formateur(s)': 'trainer(s)',
      'session(s)': 'session(s)',
      'formés': 'trained',
      'Admin': 'Admin',
      'Jour': 'Day',
      'Soir': 'Evening',
      'Nuit': 'Night',
    },

    es: {
      // ── Sidebar navigation ──
      'Tableau de bord': 'Panel principal',
      'Opérations': 'Operaciones',
      'Employés': 'Empleados',
      'Matrice de formation': 'Matriz de formación',
      'Planification': 'Planificación',
      'Stations Display': 'Pantallas de estación',
      'Formateurs': 'Formadores',
      'Sessions': 'Sesiones',
      'Checklists': 'Listas de control',
      'Administration': 'Administración',
      'Utilisateurs': 'Usuarios',
      'Paramètres': 'Configuración',
      'SharePoint / Export': 'SharePoint / Exportar',
      // ── Top navbar ──
      'Tous les départements': 'Todos los departamentos',
      'Techniciens': 'Técnicos',
      'Logistique': 'Logística',
      'Déconnexion': 'Cerrar sesión',
      // ── Table headers ──
      'Nom et Prénom': 'Nombre completo',
      'Département': 'Departamento',
      "Domaine d'expertise": 'Área de experiencia',
      'Date début': 'Fecha inicio',
      'Date fin prévue': 'Fecha fin prevista',
      'Statut': 'Estado',
      'Actions': 'Acciones',
      'Station': 'Estación',
      'Formés': 'Formados',
      'Progression': 'Progreso',
      'Employé': 'Empleado',
      'Formateur': 'Formador',
      'Superviseur': 'Supervisor',
      'Poste': 'Puesto',
      'Shift': 'Turno',
      'Total': 'Total',
      // ── Buttons ──
      'Nouveau Formateur': 'Nuevo formador',
      'Nouvelle Session': 'Nueva sesión',
      'Modifier': 'Editar',
      'Supprimer': 'Eliminar',
      'Retour': 'Volver',
      'Enregistrer': 'Guardar',
      'Annuler': 'Cancelar',
      'Importer CSV': 'Importar CSV',
      'Voir': 'Ver',
      'Exporter': 'Exportar',
      // ── Filters / dropdowns ──
      'Tous les statuts': 'Todos los estados',
      'Tous les shifts': 'Todos los turnos',
      'Tous les postes': 'Todos los puestos',
      'Tous': 'Todos',
      'Actifs': 'Activos',
      'Inactifs': 'Inactivos',
      'Rechercher…': 'Buscar…',
      // ── Status badges ──
      'En cours': 'En curso',
      'Terminée': 'Finalizada',
      'En retard': 'Atrasada',
      'Actif': 'Activo',
      'Inactif': 'Inactivo',
      'Validé': 'Validado',
      'Non validé': 'No validado',
      // ── Matrix page ──
      'Légende :': 'Leyenda:',
      'Formé ✓': 'Formado ✓',
      'En formation ⚡': 'En formación ⚡',
      'Non formé': 'No formado',
      'Couverture par station': 'Cobertura por estación',
      'À revoir': 'Por revisar',
      'En formation': 'En formación',
      // ── Employee profile ──
      'Statut par station': 'Estado por estación',
      'Pièces jointes': 'Archivos adjuntos',
      'Profil personnel': 'Perfil personal',
      'Contact': 'Contacto',
      'Informations générales': 'Información general',
      'Formé(es)': 'Formado(s)',
      'Ancienneté': 'Antigüedad',
      'Embauche': 'Contratación',
      'Naissance': 'Nacimiento',
      'Restriction': 'Restricción',
      'Passion': 'Pasión',
      'Ambition': 'Ambición',
      'Préoccupation': 'Preocupación',
      // ── Training session ──
      'Session de Formation': 'Sesión de formación',
      'Sessions de Formation': 'Sesiones de formación',
      'Liste des Formateurs': 'Lista de formadores',
      'Informations': 'Información',
      'Progression de la Formation': 'Progreso de la formación',
      'Période': 'Período',
      'Début:': 'Inicio:',
      'Fin prévue:': 'Fin prevista:',
      'Notes': 'Notas',
      'de retard': 'de retraso',
      'jour': 'día',
      'jours': 'días',
      // ── Dashboard ──
      'Formateurs Validés': 'Formadores validados',
      'Employés en Formation': 'Empleados en formación',
      'Sessions Actives': 'Sesiones activas',
      'Activité Récente': 'Actividad reciente',
      // ── Empty states ──
      'Aucun formateur enregistré': 'Ningún formador registrado',
      'Aucune session enregistrée': 'Ninguna sesión registrada',
      'Aucune session ne vous est assignée pour le moment': 'No hay sesiones asignadas por el momento',
      // ── Misc ──
      'formateur(s)': 'formador(es)',
      'session(s)': 'sesión(es)',
      'formés': 'formados',
      'Admin': 'Admin',
      'Jour': 'Día',
      'Soir': 'Tarde',
      'Nuit': 'Noche',
    }
  };

  // ── Original text cache: Map<TextNode, originalString> ──────────────
  const origCache = new Map();

  function cacheNode(node) {
    if (!origCache.has(node)) origCache.set(node, node.textContent);
  }

  function walkTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      const tag = n.parentElement ? n.parentElement.tagName : '';
      if (['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA'].includes(tag)) continue;
      cacheNode(n);
    }
  }

  // Sort entries by phrase length (longest first) to avoid partial replacements
  function buildEntries(dict) {
    return Object.entries(dict).sort((a, b) => b[0].length - a[0].length);
  }

  function translateText(origText, entries) {
    let text = origText;
    for (const [fr, target] of entries) {
      if (text.includes(fr)) {
        text = text.split(fr).join(target);
      }
    }
    return text;
  }

  function applyLang(lang) {
    // Re-walk to catch any dynamically added nodes
    walkTextNodes(document.body);

    const dict = lang === 'fr' ? null : DICT[lang];
    const entries = dict ? buildEntries(dict) : [];

    origCache.forEach((origText, node) => {
      if (!node.parentNode) return;
      const tag = node.parentElement ? node.parentElement.tagName : '';
      if (['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA'].includes(tag)) return;
      const newText = dict ? translateText(origText, entries) : origText;
      if (node.textContent !== newText) node.textContent = newText;
    });

    // Translate placeholders
    document.querySelectorAll('[placeholder]').forEach(el => {
      if (!el.dataset.i18nPh) el.dataset.i18nPh = el.placeholder;
      el.placeholder = dict ? (translateText(el.dataset.i18nPh, entries)) : el.dataset.i18nPh;
    });

    // Translate select options
    document.querySelectorAll('option').forEach(opt => {
      const orig = opt.dataset.i18nOpt !== undefined ? opt.dataset.i18nOpt : opt.textContent.trim();
      if (opt.dataset.i18nOpt === undefined) opt.dataset.i18nOpt = orig;
      const translated = dict ? (translateText(orig, entries) || orig) : orig;
      if (opt.textContent.trim() !== translated) opt.textContent = translated;
    });

    document.documentElement.lang = lang === 'en' ? 'en' : lang === 'es' ? 'es' : 'fr';
  }

  // ── Public API ───────────────────────────────────────────────────────
  window.setLang = function (lang) {
    localStorage.setItem('app_lang', lang);
    applyLang(lang);
    // Update button states
    document.querySelectorAll('.lang-btn').forEach(btn => {
      const active = btn.dataset.lang === lang;
      btn.style.fontWeight  = active ? '700' : '400';
      btn.style.opacity     = active ? '1'   : '0.55';
      btn.style.background  = active ? 'rgba(0,154,218,0.12)' : 'transparent';
      btn.style.color       = active ? 'var(--dc-blue, #009ADA)' : 'inherit';
    });
  };

  // ── Auto-apply saved language on every page load ─────────────────────
  window.addEventListener('DOMContentLoaded', function () {
    walkTextNodes(document.body);
    const saved = localStorage.getItem('app_lang') || 'fr';
    window.setLang(saved);
  });

})();
