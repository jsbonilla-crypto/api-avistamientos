const { DatabaseSync } = require('node:sqlite');

// Abre (o crea) la base de datos SQLite y se asegura de que exista la tabla.
// Si se pasa ':memory:' la base vive solo en memoria (útil para las pruebas).
function abrirBaseDeDatos(ruta = 'avistamientos.db') {
  const db = new DatabaseSync(ruta);

  db.exec(`
    CREATE TABLE IF NOT EXISTS avistamientos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      especie    TEXT NOT NULL,
      lugar      TEXT NOT NULL,
      fecha      TEXT NOT NULL,
      observador TEXT NOT NULL
    )
  `);

  return db;
}

module.exports = { abrirBaseDeDatos };
