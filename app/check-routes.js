// Check which route file is broken
// Run with: node check-routes.js

console.log('Checking route files...\n');

const routes = [
  { name: 'auth', path: './routes/auth' },
  { name: 'admin', path: './routes/admin' },
  { name: 'trainers', path: './routes/trainers' },
  { name: 'evaluations', path: './routes/evaluations' },
  { name: 'training', path: './routes/training' },
  { name: 'checklists', path: './routes/checklists' },
  { name: 'settings', path: './routes/settings' },
  { name: 'sharepoint', path: './routes/sharepoint' }
];

routes.forEach(route => {
  try {
    const loaded = require(route.path);
    const type = typeof loaded;
    const isRouter = loaded && loaded.constructor && loaded.constructor.name === 'router';
    
    if (type === 'function' || isRouter) {
      console.log(`✅ ${route.name}: OK (${isRouter ? 'Router' : 'Function'})`);
    } else {
      console.log(`❌ ${route.name}: BROKEN! Got ${type} instead of router`);
      console.log(`   Type: ${loaded.constructor ? loaded.constructor.name : type}`);
    }
  } catch (err) {
    console.log(`❌ ${route.name}: ERROR - ${err.message}`);
  }
});

console.log('\nThe broken route needs to have this at the end:');
console.log('module.exports = router;');
