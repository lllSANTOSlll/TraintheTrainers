'use strict';
const db = require('./database');

// ── Default permissions (used if DB has no rows yet) ─────────────────
const DEFAULTS = {
  user: {
    employees_view:     0, employees_edit:    0, employees_import: 0,
    matrix_view:        0, schedule_view:     0,
    sessions_view_own:  1, sessions_view_all: 0, sessions_checklist: 1,
    sessions_create:    0, checklists_edit:   0, checklists_import:  0,
    admin_delete:       0, admin_users:       0, admin_settings:     0,
  },
  trainer: {
    employees_view:     0, employees_edit:    0, employees_import: 0,
    matrix_view:        0, schedule_view:     0,
    sessions_view_own:  1, sessions_view_all: 0, sessions_checklist: 1,
    sessions_create:    0, checklists_edit:   0, checklists_import:  0,
    admin_delete:       0, admin_users:       0, admin_settings:     0,
  },
  supervisor: {
    employees_view:     1, employees_edit:    1, employees_import: 1,
    matrix_view:        1, schedule_view:     1,
    sessions_view_own:  1, sessions_view_all: 1, sessions_checklist: 1,
    sessions_create:    1, checklists_edit:   1, checklists_import:  1,
    admin_delete:       0, admin_users:       0, admin_settings:     0,
  },
  admin: {
    employees_view:     1, employees_edit:    1, employees_import: 1,
    matrix_view:        1, schedule_view:     1,
    sessions_view_own:  1, sessions_view_all: 1, sessions_checklist: 1,
    sessions_create:    1, checklists_edit:   1, checklists_import:  1,
    admin_delete:       1, admin_users:       1, admin_settings:     1,
  },
};

// All permission keys in display order
const PERMISSION_LABELS = [
  { key: 'employees_view',     label: 'Voir la liste des employés',        group: 'EMPLOYÉS & PLANIFICATION' },
  { key: 'employees_edit',     label: 'Ajouter / Modifier un employé',     group: 'EMPLOYÉS & PLANIFICATION' },
  { key: 'employees_import',   label: 'Importer CSV employés',             group: 'EMPLOYÉS & PLANIFICATION' },
  { key: 'matrix_view',        label: 'Matrice de formation',              group: 'EMPLOYÉS & PLANIFICATION' },
  { key: 'schedule_view',      label: 'Planification hebdomadaire',        group: 'EMPLOYÉS & PLANIFICATION' },
  { key: 'sessions_view_own',  label: 'Voir ses sessions assignées',       group: 'SESSIONS DE FORMATION' },
  { key: 'sessions_view_all',  label: 'Voir TOUTES les sessions',          group: 'SESSIONS DE FORMATION' },
  { key: 'sessions_checklist', label: 'Cocher la checklist',               group: 'SESSIONS DE FORMATION' },
  { key: 'sessions_create',    label: 'Créer sessions / assigner',         group: 'SESSIONS DE FORMATION' },
  { key: 'checklists_edit',    label: 'Créer / modifier modèles checklist',group: 'SESSIONS DE FORMATION' },
  { key: 'checklists_import',  label: 'Importer Word',                     group: 'SESSIONS DE FORMATION' },
  { key: 'admin_delete',       label: 'Supprimer modèles / sessions',      group: 'ADMINISTRATION' },
  { key: 'admin_users',        label: 'Gérer les utilisateurs',            group: 'ADMINISTRATION' },
  { key: 'admin_settings',     label: 'Configuration SharePoint / Thème',  group: 'ADMINISTRATION' },
];

// In-memory cache
let _cache = JSON.parse(JSON.stringify(DEFAULTS));

function load(cb) {
  db.all('SELECT role, permission_key, allowed FROM role_permissions', [], (err, rows) => {
    if (err || !rows || rows.length === 0) {
      _cache = JSON.parse(JSON.stringify(DEFAULTS));
      return cb && cb();
    }
    const fresh = JSON.parse(JSON.stringify(DEFAULTS));
    rows.forEach(r => {
      if (fresh[r.role] && fresh[r.role][r.permission_key] !== undefined) {
        fresh[r.role][r.permission_key] = r.allowed ? 1 : 0;
      }
    });
    _cache = fresh;
    cb && cb();
  });
}

function can(role, permission) {
  if (!role || !permission) return false;
  if (!_cache[role]) return false;
  return _cache[role][permission] === 1;
}

function getAll()      { return JSON.parse(JSON.stringify(_cache)); }
function getLabels()   { return PERMISSION_LABELS; }
function getDefaults() { return DEFAULTS; }

module.exports = { load, can, getAll, getLabels, getDefaults, DEFAULTS };
