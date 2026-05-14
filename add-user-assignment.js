// Add assigned_user_id column to training_sessions
// Run with: node add-user-assignment.js

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/trainers.db');

console.log('🔧 Adding user assignment to sessions...\n');

db.serialize(() => {
  // Check if column already exists
  db.all("PRAGMA table_info(training_sessions)", [], (err, columns) => {
    if (err) {
      console.error('Error checking table:', err);
      return;
    }

    const hasColumn = columns.some(col => col.name === 'assigned_user_id');
    
    if (hasColumn) {
      console.log('✓ Column assigned_user_id already exists');
      db.close();
      return;
    }

    // Add the column
    db.run('ALTER TABLE training_sessions ADD COLUMN assigned_user_id INTEGER REFERENCES users(id)',
      (err) => {
        if (err) {
          console.error('Error adding column:', err);
        } else {
          console.log('✅ Column assigned_user_id added successfully!');
          console.log('\n📝 Next steps:');
          console.log('   1. Replace the new files (training.js, training views)');
          console.log('   2. Restart server: npm start');
          console.log('   3. Edit existing sessions to assign them to users');
          console.log('   4. New sessions can be assigned during creation');
        }
        db.close();
      }
    );
  });
});
