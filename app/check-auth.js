// Quick diagnostic - run with: node check-auth.js

console.log('Checking auth.js exports...\n');

try {
  const auth = require('./middleware/auth');
  
  console.log('✅ auth.js loaded successfully');
  console.log('\nExported functions:');
  console.log('  - isAuthenticated:', typeof auth.isAuthenticated);
  console.log('  - isAdmin:', typeof auth.isAdmin);
  console.log('  - isSupervisorOrAdmin:', typeof auth.isSupervisorOrAdmin);
  console.log('  - canManage:', typeof auth.canManage);
  
  if (typeof auth.isSupervisorOrAdmin === 'undefined') {
    console.log('\n❌ ERROR: isSupervisorOrAdmin is undefined!');
    console.log('   You need to replace middleware/auth.js with auth-NEW.js');
  } else {
    console.log('\n✅ All functions present!');
  }
  
} catch (err) {
  console.log('❌ Error loading auth.js:');
  console.log(err.message);
}
