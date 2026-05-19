const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isSupervisorOrAdmin, getDeptFilter } = require('../middleware/auth');

router.use(isSupervisorOrAdmin);

router.use((req, res, next) => {
  const user = req.session.user;
  const dept = user.role === 'admin' ? (req.session.adminDept || '') : (user.department || '');
  if (user.role !== 'admin' && dept !== 'Operations') {
    return res.status(403).render('error', {
      title: 'Non disponible',
      message: 'La planification hebdomadaire n\'est pas encore disponible pour ce département.',
      error: { status: 403 }
    });
  }
  next();
});

const STATIONS = [
  { key: 'ip_vav',      label: 'IP VAV' },
  { key: 'ip_stat',     label: 'IP STAT' },
  { key: 'ip_ctrl_2',   label: 'IP CTRL 2' },
  { key: 'smartvue',    label: 'Smartvue' },
  { key: 'unitouch',    label: 'Unitouch' },
  { key: 'iom',         label: 'IOM' },
  { key: 'ip_303',      label: 'IP 303' },
  { key: 'test_1',      label: '1 TEST' },
  { key: 's1000',       label: 'S1000' },
  { key: 'ecbl_4_6',    label: 'ECBL 4/6' },
  { key: 'ecbl_2_3',    label: 'ECBL 2/3' },
  { key: 'ecbl_vav_s',  label: 'ECBL VAV/S' },
  { key: 'kit_demobox', label: 'Kit Demobox' },
  { key: 'vavn_103',    label: '103 VAVN' },
  { key: 'display',     label: 'Display' },
  { key: 'ecy_4_6',     label: 'ECY 4/6' },
  { key: 'ecbos',       label: 'ECBOS' },
  { key: 'resence',     label: 'Resence' },
  { key: 'horyzon',     label: 'Horyzon' },
  { key: 'ecy_2_3',     label: 'ECY 2/3' },
  { key: 'immersion',   label: 'Immersion' },
];

const DAYS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
const DAY_LABELS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function addWeeks(mondayStr, n) {
  const d = new Date(mondayStr + 'T12:00:00');
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().split('T')[0];
}

function formatWeekLabel(mondayStr) {
  const d = new Date(mondayStr + 'T12:00:00');
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  const fmt = (dt) => dt.toLocaleDateString('fr-CA', { month: 'long', day: 'numeric' });
  return `Semaine du ${fmt(d)} au ${fmt(end)} ${d.getFullYear()}`;
}

function getDayDates(mondayStr) {
  return DAYS.map((_, i) => {
    const d = new Date(mondayStr + 'T12:00:00');
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' });
  });
}

// GET /schedule — show schedule for a week
router.get('/', (req, res) => {
  const weekStart = req.query.week ? getMondayOf(req.query.week) : getMondayOf(new Date());
  const shift = req.query.shift || '';
  const dept = getDeptFilter(req);

  let empSql = "SELECT * FROM employees WHERE statut = 'Actif'";
  const empParams = [];
  if (dept !== null) { empSql += ' AND department = ?'; empParams.push(dept); }
  if (shift)         { empSql += ' AND shift = ?';      empParams.push(shift); }
  empSql += ' ORDER BY nom ASC';

  db.all(empSql, empParams, (err, employees) => {
    if (err) { console.error(err); return res.status(500).send('Erreur'); }

    db.all('SELECT * FROM schedule_weeks WHERE week_start = ?', [weekStart], (err, schedRows) => {
      if (err) { console.error(err); return res.status(500).send('Erreur'); }

      const schedMap = {};
      schedRows.forEach(r => { schedMap[r.employee_id] = r; });

      res.render('schedule/index', {
        title: 'Planification',
        employees, stations: STATIONS,
        days: DAYS, dayLabels: DAY_LABELS,
        dayDates: getDayDates(weekStart),
        weekStart,
        prevWeek: addWeeks(weekStart, -1),
        nextWeek: addWeeks(weekStart, 1),
        weekLabel: formatWeekLabel(weekStart),
        schedMap,
        filterShift: shift
      });
    });
  });
});

// POST /schedule/save — save the week schedule
router.post('/save', (req, res) => {
  const { week_start, shift } = req.body;
  const employeeIds = req.body.employee_ids ? req.body.employee_ids.split(',') : [];

  if (!week_start || !employeeIds.length) {
    return res.redirect('/schedule?week=' + (week_start || ''));
  }

  let remaining = employeeIds.length;

  employeeIds.forEach(empId => {
    const dayData = {};
    DAYS.forEach(d => { dayData[d] = (req.body[`${empId}_${d}`] || ''); });

    db.get('SELECT id FROM schedule_weeks WHERE week_start = ? AND employee_id = ?',
      [week_start, empId], (err, existing) => {
        if (existing) {
          const sets = DAYS.map(d => `${d} = ?`).join(', ');
          db.run(`UPDATE schedule_weeks SET ${sets} WHERE week_start = ? AND employee_id = ?`,
            [...DAYS.map(d => dayData[d]), week_start, empId]);
        } else {
          db.run(
            `INSERT INTO schedule_weeks (week_start, employee_id, ${DAYS.join(',')}) VALUES (?,?,${DAYS.map(() => '?').join(',')})`,
            [week_start, empId, ...DAYS.map(d => dayData[d])]
          );
        }
        remaining--;
        if (remaining === 0) {
          const qs = new URLSearchParams({ week: week_start, shift: shift || '', saved: '1' });
          res.redirect('/schedule?' + qs.toString());
        }
      }
    );
  });

  if (employeeIds.length === 0) {
    res.redirect('/schedule?week=' + week_start);
  }
});

// GET /schedule/auto — auto-planning preview page
router.get('/auto', (req, res) => {
  const sourceWeek = req.query.week ? getMondayOf(req.query.week) : getMondayOf(new Date());
  const targetWeek = addWeeks(sourceWeek, 1);
  const shift = req.query.shift || '';
  const dept = getDeptFilter(req);

  let empSql = "SELECT * FROM employees WHERE statut = 'Actif'";
  const empParams = [];
  if (dept !== null) { empSql += ' AND department = ?'; empParams.push(dept); }
  if (shift)         { empSql += ' AND shift = ?';      empParams.push(shift); }
  empSql += ' ORDER BY nom ASC';

  db.all(empSql, empParams, (err, employees) => {
    if (err) { console.error(err); return res.status(500).send('Erreur'); }

    db.all('SELECT * FROM schedule_weeks WHERE week_start = ?', [sourceWeek], (err, schedRows) => {
      if (err) { console.error(err); return res.status(500).send('Erreur'); }

      const schedMap = {};
      schedRows.forEach(r => { schedMap[r.employee_id] = r; });

      const copyPlan    = computeAutoSchedule(employees, schedMap, 'copy',   DAYS, STATIONS);
      const rotatePlan  = computeAutoSchedule(employees, schedMap, 'rotate', DAYS, STATIONS);

      res.render('schedule/auto', {
        title: 'Planification automatique',
        employees, stations: STATIONS,
        days: DAYS, dayLabels: DAY_LABELS,
        dayDates: getDayDates(targetWeek),
        sourceWeek, targetWeek,
        sourceWeekLabel: formatWeekLabel(sourceWeek),
        targetWeekLabel: formatWeekLabel(targetWeek),
        copyPlan:   JSON.stringify(copyPlan),
        rotatePlan: JSON.stringify(rotatePlan),
        filterShift: shift
      });
    });
  });
});

// POST /schedule/auto/apply — compute & save the chosen plan for next week
router.post('/auto/apply', (req, res) => {
  const { source_week, target_week, algorithm, shift } = req.body;
  const employeeIds = req.body.employee_ids ? req.body.employee_ids.split(',') : [];

  if (!target_week || !employeeIds.length) {
    return res.redirect('/schedule/auto?week=' + (source_week || ''));
  }

  const placeholders = employeeIds.map(() => '?').join(',');
  db.all(`SELECT * FROM employees WHERE id IN (${placeholders})`, employeeIds, (err, employees) => {
    if (err) { console.error(err); return res.status(500).send('Erreur'); }

    db.all('SELECT * FROM schedule_weeks WHERE week_start = ?', [source_week], (err, schedRows) => {
      if (err) { console.error(err); return res.status(500).send('Erreur'); }

      const schedMap = {};
      schedRows.forEach(r => { schedMap[r.employee_id] = r; });

      const plan = computeAutoSchedule(employees, schedMap, algorithm || 'copy', DAYS, STATIONS);

      let remaining = employees.length;
      if (remaining === 0) {
        return res.redirect('/schedule?week=' + target_week + '&saved=1');
      }

      employees.forEach(emp => {
        const dayData = plan[emp.id] || {};
        db.get('SELECT id FROM schedule_weeks WHERE week_start = ? AND employee_id = ?',
          [target_week, emp.id], (err, existing) => {
            if (existing) {
              const sets = DAYS.map(d => `${d} = ?`).join(', ');
              db.run(`UPDATE schedule_weeks SET ${sets} WHERE week_start = ? AND employee_id = ?`,
                [...DAYS.map(d => dayData[d] || ''), target_week, emp.id]);
            } else {
              db.run(
                `INSERT INTO schedule_weeks (week_start, employee_id, ${DAYS.join(',')}) VALUES (?,?,${DAYS.map(() => '?').join(',')})`,
                [target_week, emp.id, ...DAYS.map(d => dayData[d] || '')]
              );
            }
            remaining--;
            if (remaining === 0) {
              const qs = new URLSearchParams({ week: target_week, saved: '1' });
              res.redirect('/schedule?' + qs.toString());
            }
          }
        );
      });
    });
  });
});

function computeAutoSchedule(employees, schedMap, algorithm, DAYS, STATIONS) {
  const result = {};
  employees.forEach(emp => {
    const trained = STATIONS.filter(s => (emp[s.key] || '').trim() === 'Oui').map(s => s.key);
    const src = schedMap[emp.id] || {};
    const dayPlan = {};

    DAYS.forEach(d => {
      const cur = src[d] || '';
      if (algorithm === 'copy') {
        dayPlan[d] = cur;
      } else {
        // rotate: advance to next trained station; keep Repos if not working
        if (!cur) {
          dayPlan[d] = '';
        } else if (trained.length === 0) {
          dayPlan[d] = cur;
        } else {
          const idx = trained.indexOf(cur);
          dayPlan[d] = idx === -1
            ? trained[0]
            : trained[(idx + 1) % trained.length];
        }
      }
    });

    result[emp.id] = dayPlan;
  });
  return result;
}

module.exports = router;
