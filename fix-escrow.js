const mariadb = require('mariadb');

async function fixEscrow() {
  let conn;
  try {
    conn = await mariadb.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'nebeng'
    });
    
    console.log('Terhubung ke database...');
    const result = await conn.query('UPDATE wallets SET held_escrow_balance = 0 WHERE held_escrow_balance < 0');
    console.log(`Perbaikan selesai! ${result.affectedRows} wallet diperbarui.`);
  } catch (err) {
    console.error('Gagal terhubung atau update database:', err);
  } finally {
    if (conn) conn.end();
  }
}

fixEscrow();
