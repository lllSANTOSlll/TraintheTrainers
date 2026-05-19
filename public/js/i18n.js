(function () {
  'use strict';

  const FLAGS = { fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸' };
  const CODES  = { fr: 'FR',   en: 'EN',   es: 'ES'  };

  // ── Translation dictionaries (French is the source language) ─────────
  const DICT = {
    en: {
      // ── Sidebar ──
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
      // ── Navbar ──
      'Tous les départements': 'All Departments',
      'Techniciens': 'Technicians',
      'Logistique': 'Logistics',
      'Déconnexion': 'Logout',
      'Cerrar sesión': 'Logout',
      'Administrateur': 'Administrator',
      // ── Checklist page ──
      'Modèles de Checklist': 'Checklist Templates',
      'Nouveau Modèle': 'New Template',
      'Télécharger Template': 'Download Template',
      'Importer Word': 'Import Word',
      'Gérer Items': 'Manage Items',
      'Aucune description': 'No description',
      'éléments': 'items',
      'élément': 'item',
      'Aucun modèle de checklist': 'No checklist templates',
      'Créez votre premier modèle': 'Create your first template',
      'Nom du modèle': 'Template name',
      'Description': 'Description',
      'Créer le modèle': 'Create template',
      'Modifier le modèle': 'Edit template',
      'Items de la Checklist': 'Checklist Items',
      'Ajouter un item': 'Add item',
      'Jour de formation': 'Training day',
      'Catégorie': 'Category',
      'Critère': 'Criterion',
      'Ordre': 'Order',
      'Importer depuis Word': 'Import from Word',
      // ── Training sessions ──
      'Sessions de Formation': 'Training Sessions',
      'Session de Formation': 'Training Session',
      'Nouvelle Session': 'New Session',
      'Progression de la Formation': 'Training Progress',
      'Affichage des sessions qui vous sont assignées': 'Showing sessions assigned to you',
      'Aucune session enregistrée': 'No sessions recorded',
      'Aucune session ne vous est assignée pour le moment': 'No sessions assigned to you yet',
      'Reporter au jour suivant': 'Roll over to next day',
      'Compléter la session': 'Complete session',
      // ── Trainers ──
      'Liste des Formateurs': 'Trainers List',
      'Nouveau Formateur': 'New Trainer',
      'Aucun formateur enregistré': 'No trainers registered',
      // ── Employees ──
      'Statut par station': 'Status by Station',
      'Pièces jointes': 'Attachments',
      'Profil personnel': 'Personal Profile',
      'Informations générales': 'General Information',
      'Formé(es)': 'Trained',
      'En formation': 'In Training',
      'Glissez des fichiers ici ou': 'Drag files here or',
      'cliquez pour parcourir': 'click to browse',
      'Aucune pièce jointe pour l\'instant': 'No attachments yet',
      'Envoyer les fichiers': 'Upload files',
      'Ancienneté': 'Seniority',
      'Embauche': 'Hire date',
      'Naissance': 'Birth date',
      'Restriction': 'Restriction',
      'Passion': 'Passion',
      'Ambition': 'Ambition',
      'Préoccupation': 'Concern',
      'Aucun employé trouvé. Importez vos employés d\'abord.': 'No employees found. Import your employees first.',
      'Importer CSV': 'Import CSV',
      'Importer les employés': 'Import employees',
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
      'Contact': 'Contact',
      'Informations': 'Information',
      'Période': 'Period',
      'Début:': 'Start:',
      'Fin prévue:': 'Expected end:',
      'Notes': 'Notes',
      // ── Filters ──
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
      // ── Matrix ──
      'Légende :': 'Legend:',
      'Formé ✓': 'Trained ✓',
      'En formation ⚡': 'In Training ⚡',
      'Non formé': 'Not Trained',
      'Couverture par station': 'Station Coverage',
      'À revoir': 'To Review',
      // ── Buttons ──
      'Modifier': 'Edit',
      'Supprimer': 'Delete',
      'Retour': 'Back',
      'Enregistrer': 'Save',
      'Annuler': 'Cancel',
      'Voir': 'View',
      'Exporter': 'Export',
      'Créer': 'Create',
      'Ajouter': 'Add',
      // ── Dashboard ──
      'Formateurs Validés': 'Validated Trainers',
      'Employés en Formation': 'Employees in Training',
      'Sessions Actives': 'Active Sessions',
      'Activité Récente': 'Recent Activity',
      // ── Days/time ──
      'de retard': 'late',
      'jours': 'days',
      'jour': 'day',
      // ── Misc ──
      'formateur(s)': 'trainer(s)',
      'session(s)': 'session(s)',
      'formés': 'trained',
      'Admin': 'Admin',
      'Jour': 'Day',
      'Soir': 'Evening',
      'Nuit': 'Night',
      '% formés': '% trained',
    },

    es: {
      // ── Sidebar ──
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
      // ── Navbar ──
      'Tous les départements': 'Todos los departamentos',
      'Techniciens': 'Técnicos',
      'Logistique': 'Logística',
      'Déconnexion': 'Cerrar sesión',
      'Administrateur': 'Administrador',
      // ── Checklist page ──
      'Modèles de Checklist': 'Modelos de Checklist',
      'Nouveau Modèle': 'Nuevo modelo',
      'Télécharger Template': 'Descargar plantilla',
      'Importer Word': 'Importar Word',
      'Gérer Items': 'Gestionar items',
      'Aucune description': 'Sin descripción',
      'éléments': 'elementos',
      'élément': 'elemento',
      'Aucun modèle de checklist': 'Sin modelos de checklist',
      'Créez votre premier modèle': 'Crea tu primer modelo',
      'Nom du modèle': 'Nombre del modelo',
      'Description': 'Descripción',
      'Créer le modèle': 'Crear modelo',
      'Modifier le modèle': 'Editar modelo',
      'Items de la Checklist': 'Ítems de la checklist',
      'Ajouter un item': 'Agregar ítem',
      'Jour de formation': 'Día de formación',
      'Catégorie': 'Categoría',
      'Critère': 'Criterio',
      'Ordre': 'Orden',
      'Importer depuis Word': 'Importar desde Word',
      // ── Training sessions ──
      'Sessions de Formation': 'Sesiones de formación',
      'Session de Formation': 'Sesión de formación',
      'Nouvelle Session': 'Nueva sesión',
      'Progression de la Formation': 'Progreso de la formación',
      'Affichage des sessions qui vous sont assignées': 'Mostrando sesiones asignadas a usted',
      'Aucune session enregistrée': 'Ninguna sesión registrada',
      'Aucune session ne vous est assignée pour le moment': 'No hay sesiones asignadas por el momento',
      'Reporter au jour suivant': 'Pasar al día siguiente',
      'Compléter la session': 'Completar sesión',
      // ── Trainers ──
      'Liste des Formateurs': 'Lista de formadores',
      'Nouveau Formateur': 'Nuevo formador',
      'Aucun formateur enregistré': 'Ningún formador registrado',
      // ── Employees ──
      'Statut par station': 'Estado por estación',
      'Pièces jointes': 'Archivos adjuntos',
      'Profil personnel': 'Perfil personal',
      'Informations générales': 'Información general',
      'Formé(es)': 'Formado(s)',
      'En formation': 'En formación',
      'Glissez des fichiers ici ou': 'Arrastre archivos aquí o',
      'cliquez pour parcourir': 'haga clic para buscar',
      'Aucune pièce jointe pour l\'instant': 'Sin archivos adjuntos por ahora',
      'Envoyer les fichiers': 'Enviar archivos',
      'Ancienneté': 'Antigüedad',
      'Embauche': 'Contratación',
      'Naissance': 'Nacimiento',
      'Restriction': 'Restricción',
      'Passion': 'Pasión',
      'Ambition': 'Ambición',
      'Préoccupation': 'Preocupación',
      'Importer CSV': 'Importar CSV',
      'Importer les employés': 'Importar empleados',
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
      'Contact': 'Contacto',
      'Informations': 'Información',
      'Période': 'Período',
      'Début:': 'Inicio:',
      'Fin prévue:': 'Fin prevista:',
      'Notes': 'Notas',
      // ── Filters ──
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
      // ── Matrix ──
      'Légende :': 'Leyenda:',
      'Formé ✓': 'Formado ✓',
      'En formation ⚡': 'En formación ⚡',
      'Non formé': 'No formado',
      'Couverture par station': 'Cobertura por estación',
      'À revoir': 'Por revisar',
      // ── Buttons ──
      'Modifier': 'Editar',
      'Supprimer': 'Eliminar',
      'Retour': 'Volver',
      'Enregistrer': 'Guardar',
      'Annuler': 'Cancelar',
      'Voir': 'Ver',
      'Exporter': 'Exportar',
      'Créer': 'Crear',
      'Ajouter': 'Agregar',
      // ── Dashboard ──
      'Formateurs Validés': 'Formadores validados',
      'Employés en Formation': 'Empleados en formación',
      'Sessions Actives': 'Sesiones activas',
      'Activité Récente': 'Actividad reciente',
      // ── Days/time ──
      'de retard': 'de retraso',
      'jours': 'días',
      'jour': 'día',
      // ── Misc ──
      'formateur(s)': 'formador(es)',
      'session(s)': 'sesión(es)',
      'formés': 'formados',
      'Admin': 'Admin',
      'Jour': 'Día',
      'Soir': 'Tarde',
      'Nuit': 'Noche',
      '% formés': '% formados',
    }
  };

  // ── Original text cache (Map: TextNode → original FR string) ─────────
  const origCache = new Map();

  function cacheTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!n.parentElement) continue;
      const tag = n.parentElement.tagName;
      if (['SCRIPT','STYLE','INPUT','TEXTAREA'].includes(tag)) continue;
      if (!origCache.has(n)) origCache.set(n, n.textContent);
    }
  }

  // Sort phrases longest-first to prevent partial matches
  function buildEntries(dict) {
    return Object.entries(dict).sort((a, b) => b[0].length - a[0].length);
  }

  function translateText(text, entries) {
    for (const [fr, target] of entries) {
      if (text.includes(fr)) text = text.split(fr).join(target);
    }
    return text;
  }

  function applyLang(lang) {
    // Cache BEFORE any translation so we always store the original French text
    cacheTextNodes(document.body);

    const dict    = lang === 'fr' ? null : DICT[lang];
    const entries = dict ? buildEntries(dict) : [];

    // ── Text nodes (covers all elements including <option> children) ──
    origCache.forEach((origText, node) => {
      if (!node.parentNode) return;
      const tag = node.parentElement ? node.parentElement.tagName : '';
      if (['SCRIPT','STYLE','INPUT','TEXTAREA'].includes(tag)) return;
      const newText = dict ? translateText(origText, entries) : origText;
      if (node.textContent !== newText) node.textContent = newText;
    });

    // ── Placeholders (attribute value — not a text node, needs separate handling) ──
    document.querySelectorAll('[placeholder]').forEach(el => {
      // Save original French placeholder once, never overwrite
      if (!el.dataset.i18nPh) el.dataset.i18nPh = el.placeholder;
      el.placeholder = dict ? translateText(el.dataset.i18nPh, entries) : el.dataset.i18nPh;
    });

    // ── Page title ──
    if (!document._i18nOrigTitle) document._i18nOrigTitle = document.title;
    document.title = dict ? translateText(document._i18nOrigTitle, entries) : document._i18nOrigTitle;

    document.documentElement.lang = lang;
  }

  // ── Update the dropdown button label ────────────────────────────────
  function updateDropdownBtn(lang) {
    const flagEl = document.getElementById('lang-flag');
    const codeEl = document.getElementById('lang-code');
    if (flagEl) flagEl.textContent = FLAGS[lang] || '🇫🇷';
    if (codeEl) codeEl.textContent = CODES[lang] || 'FR';

    // Highlight active item
    document.querySelectorAll('.lang-btn').forEach(item => {
      item.classList.toggle('active', item.dataset.lang === lang);
    });
  }

  // ── Public API ───────────────────────────────────────────────────────
  window.setLang = function (lang) {
    localStorage.setItem('app_lang', lang);
    applyLang(lang);
    updateDropdownBtn(lang);
  };

  // ── Auto-apply on every page load ────────────────────────────────────
  window.addEventListener('DOMContentLoaded', function () {
    cacheTextNodes(document.body);
    const saved = localStorage.getItem('app_lang') || 'fr';
    applyLang(saved);
    updateDropdownBtn(saved);
  });

})();
