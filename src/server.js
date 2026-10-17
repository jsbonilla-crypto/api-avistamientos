const { abrirBaseDeDatos } = require('./db');
const { crearApp } = require('./app');

const PUERTO = process.env.PORT || 3000;

const db = abrirBaseDeDatos('avistamientos.db');
const app = crearApp(db);

app.listen(PUERTO, () => {
  console.log(`API de avistamientos escuchando en http://localhost:${PUERTO}`);
});
