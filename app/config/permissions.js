'use strict';
const db = require('./database');

// ── Default role permissions ──────────────────────────────────────────
const DEFAULTS = {
  user: {
    employees_view:0, employees_edit:0, employees_import:0,
    matrix_view:0, schedule_view:0, stations_view:0, stations_edit:0,
    sessions_view_own:1, sessions_view_all:0, sessions_checklist:1,
    sessions_create:0, checklists_edit:0, checklists_import:0,
    suivi_view:0, suivi_edit:0,
    analytics_view:0, coverage_view:0, actions_view:0, actions_edit:0,
    admin_delete:0, admin_users:0, admin_settings:0,
  },
  trainer: {
    employees_view:0, employees_edit:0, employees_import:0,
    matrix_view:0, schedule_view:0, stations_view:0, stations_edit:0,
    sessions_view_own:1, sessions_view_all:0, sessions_checklist:1,
    sessions_create:0, checklists_edit:0, checklists_import:0,
    suivi_view:0, suivi_edit:0,
    analytics_view:0, coverage_view:0, actions_view:0, actions_edit:0,
    admin_delete:0, admin_users:0, admin_settings:0,
  },
  supervisor: {
    employees_view:1, employees_edit:1, employees_import:1,
    matrix_view:1, schedule_view:1, stations_view:1, stations_edit:1,
    sessions_view_own:1, sessions_view_all:1, sessions_checklist:1,
    sessions_create:1, checklists_edit:1, checklists_import:1,
    suivi_view:1, suivi_edit:1,
    analytics_view:0, coverage_view:1, actions_view:1, actions_edit:0,
    admin_delete:0, admin_users:0, admin_settings:0,
  },
  admin: {
    employees_view:1, employees_edit:1, employees_import:1,
    matrix_view:1, schedule_view:1, stations_view:1, stations_edit:1,
    sessions_view_own:1, sessions_view_all:1, sessions_checklist:1,
    sessions_create:1, checklists_edit:1, checklists_import:1,
    suivi_view:1, suivi_edit:1,
    analytics_view:1, coverage_view:1, actions_view:1, actions_edit:1,
    admin_delete:1, admin_users:1, admin_settings:1,
  },
};

// ── Default department extra permissions (all OFF by default) ─────────
const DEPT_DEFAULTS = {
  Operations:  { employees_view:0, employees_edit:0, employees_import:0, matrix_view:0, schedule_view:0, stations_view:0, stations_edit:0, sessions_view_own:0, sessions_view_all:0, sessions_checklist:0, sessions_create:0, checklists_edit:0, checklists_import:0, suivi_view:0, suivi_edit:0, analytics_view:0, coverage_view:0, actions_view:0, actions_edit:0, admin_delete:0, admin_users:0, admin_settings:0 },
  Technicians: { employees_view:0, employees_edit:0, employees_import:0, matrix_view:0, schedule_view:0, stations_view:0, stations_edit:0, sessions_view_own:0, sessions_view_all:0, sessions_checklist:0, sessions_create:0, checklists_edit:0, checklists_import:0, suivi_view:0, suivi_edit:0, analytics_view:0, coverage_view:0, actions_view:0, actions_edit:0, admin_delete:0, admin_users:0, admin_settings:0 },
  Logistics:   { employees_view:0, employees_edit:0, employees_import:0, matrix_view:0, schedule_view:0, stations_view:0, stations_edit:0, sessions_view_own:0, sessions_view_all:0, sessions_checklist:0, sessions_create:0, checklists_edit:0, checklists_import:0, suivi_view:0, suivi_edit:0, analytics_view:0, coverage_view:0, actions_view:0, actions_edit:0, admin_delete:0, admin_users:0, admin_settings:0 },
};

// ── Permission labels (display order) ─────────────────────────────────
const PERMISSION_LABELS = [
  { key:'employees_view',     label:'Voir la liste des employés',         group:'EMPLOYÉS & PLANIFICATION' },
  { key:'employees_edit',     label:'Ajouter / Modifier un employé',      group:'EMPLOYÉS & PLANIFICATION' },
  { key:'employees_import',   label:'Importer CSV employés',              group:'EMPLOYÉS & PLANIFICATION' },
  { key:'matrix_view',        label:'Matrice de formation',               group:'EMPLOYÉS & PLANIFICATION' },
  { key:'schedule_view',      label:'Planification hebdomadaire',         group:'EMPLOYÉS & PLANIFICATION' },
  { key:'stations_view',      label:'Voir les postes de travail',          group:'EMPLOYÉS & PLANIFICATION' },
  { key:'stations_edit',      label:'Créer / modifier postes de travail',  group:'EMPLOYÉS & PLANIFICATION' },
  { key:'sessions_view_own',  label:'Voir ses sessions assignées',        group:'SESSIONS DE FORMATION' },
  { key:'sessions_view_all',  label:'Voir TOUTES les sessions',           group:'SESSIONS DE FORMATION' },
  { key:'sessions_checklist', label:'Cocher la checklist',                group:'SESSIONS DE FORMATION' },
  { key:'sessions_create',    label:'Créer sessions / assigner',          group:'SESSIONS DE FORMATION' },
  { key:'checklists_edit',    label:'Créer / modifier modèles checklist', group:'SESSIONS DE FORMATION' },
  { key:'checklists_import',  label:'Importer Word',                      group:'SESSIONS DE FORMATION' },
  { key:'suivi_view',         label:'Voir le Suivi Employés',             group:'SUIVI EMPLOYÉS' },
  { key:'suivi_edit',         label:'Modifier statuts / commentaires',    group:'SUIVI EMPLOYÉS' },
  { key:'analytics_view',     label:'KPI & Analytique',                   group:'ADMINISTRATION' },
  { key:'coverage_view',      label:'Couverture & Polyvalence',           group:'ADMINISTRATION' },
  { key:'actions_view',       label:'Voir les Actions Correctives',       group:'ADMINISTRATION' },
  { key:'actions_edit',       label:'Créer / modifier Actions Correctives', group:'ADMINISTRATION' },
  { key:'admin_delete',       label:'Supprimer modèles / sessions',       group:'ADMINISTRATION' },
  { key:'admin_users',        label:'Gérer les utilisateurs',             group:'ADMINISTRATION' },
  { key:'admin_settings',     label:'Configuration SharePoint / Thème',   group:'ADMINISTRATION' },
];

// ── In-memory caches ──────────────────────────────────────────────────
let _roles = JSON.parse(JSON.stringify(DEFAULTS));
let _depts = JSON.parse(JSON.stringify(DEPT_DEFAULTS));

function load(cb) {
  db.all('SELECT role, permission_key, allowed FROM role_permissions', [], (err, roleRows) => {
    const freshRoles = JSON.parse(JSON.stringify(DEFAULTS));
    if (!err && roleRows && roleRows.length > 0) {
      roleRows.forEach(r => {
        if (freshRoles[r.role] && freshRoles[r.role][r.permission_key] !== undefined) {
          freshRoles[r.role][r.permission_key] = r.allowed ? 1 : 0;
        }
      });
    }
    _roles = freshRoles;

    db.all('SELECT department, permission_key, allowed FROM dept_permissions', [], (err2, deptRows) => {
      const freshDepts = JSON.parse(JSON.stringify(DEPT_DEFAULTS));
      if (!err2 && deptRows && deptRows.length > 0) {
        deptRows.forEach(r => {
          if (freshDepts[r.department] && freshDepts[r.department][r.permission_key] !== undefined) {
            freshDepts[r.department][r.permission_key] = r.allowed ? 1 : 0;
          }
        });
      }
      _depts = freshDepts;
      cb && cb();
    });
  });
}

// ── Permission check: role OR department grants access ─────────────────
// Admin always has access regardless of department
function can(role, permission, department) {
  if (!role || !permission) return false;
  if (role === 'admin') return true;
  const byRole = _roles[role] && _roles[role][permission] === 1;
  const byDept = department && _depts[department] && _depts[department][permission] === 1;
  return byRole || byDept;
}

function getRoles()      { return JSON.parse(JSON.stringify(_roles)); }
function getDepts()      { return JSON.parse(JSON.stringify(_depts)); }
function getLabels()     { return PERMISSION_LABELS; }
function getAll()        { return JSON.parse(JSON.stringify(_roles)); } // backwards compat

module.exports = { load, can, getRoles, getDepts, getAll, getLabels, DEFAULTS, DEPT_DEFAULTS };
