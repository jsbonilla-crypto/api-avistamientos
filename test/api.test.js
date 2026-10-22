// Pruebas de integración: levantan la API con una base en memoria
// y le hacen peticiones HTTP reales con fetch.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { abrirBaseDeDatos } = require('../src/db');
const { crearApp, validarAvistamiento } = require('../src/app');

let servidor;
let base;

before(async () => {
  const app = crearApp(abrirBaseDeDatos(':memory:'));
  await new Promise((resolve) => {
    servidor = app.listen(0, resolve);
  });
  base = `http://localhost:${servidor.address().port}`;
});

after(() => servidor.close());

const pedir = (ruta, metodo = 'GET', cuerpo) =>
  fetch(base + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });

const colibri = {
  especie: 'colibrí',
  lugar: 'Humedal La Conejera, Bogotá',
  fecha: '2026-09-29',
  observador: 'Sebastián Morales',
};

// --- Pruebas unitarias de la validación ---

test('validación: un avistamiento completo no tiene errores', () => {
  assert.deepEqual(validarAvistamiento(colibri), []);
});

test('validación: detecta campos faltantes y fecha inválida', () => {
  const errores = validarAvistamiento({ especie: 'tucán', fecha: '2026-13-40' });
  assert.equal(errores.length, 3); // lugar, observador y fecha
});


test('validación: rechaza especies con menos de 3 caracteres', () => {
  const errores = validarAvistamiento({
    ...colibri,
    especie: 'ab',
  });

  assert.ok(errores.includes('La especie debe tener entre 3 y 50 caracteres'));
});

test('validación: rechaza especies con más de 50 caracteres', () => {
  const errores = validarAvistamiento({
    ...colibri,
    especie: 'a'.repeat(51),
  });

  assert.ok(errores.includes('La especie debe tener entre 3 y 50 caracteres'));
});

test('validación: rechaza fechas futuras', () => {
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);

  const fechaFutura = [
    manana.getFullYear(),
    String(manana.getMonth() + 1).padStart(2, '0'),
    String(manana.getDate()).padStart(2, '0'),
  ].join('-');

  const errores = validarAvistamiento({
    ...colibri,
    fecha: fechaFutura,
  });

  assert.ok(errores.includes('La fecha no puede ser posterior al día de hoy'));
});


test('validación: acepta una especie de 3 caracteres', () => {
  const errores = validarAvistamiento({
    ...colibri,
    especie: 'ave',
  });

  assert.deepEqual(errores, []);
});

test('validación: acepta una especie de 50 caracteres', () => {
  const errores = validarAvistamiento({
    ...colibri,
    especie: 'a'.repeat(50),
  });

  assert.deepEqual(errores, []);
});

test('validación: rechaza un cuerpo que no sea un objeto', () => {
  assert.deepEqual(
    validarAvistamiento(null),
    ['El cuerpo debe ser un objeto JSON']
  );
});

// --- Pruebas de integración de los endpoints ---

test('GET /avistamientos devuelve 200 y una lista', async () => {
  const res = await pedir('/avistamientos');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(await res.json()));
});

test('flujo completo: crear, ver, actualizar, eliminar', async () => {
  // POST -> 201
  let res = await pedir('/avistamientos', 'POST', colibri);
  assert.equal(res.status, 201);
  const creado = await res.json();
  assert.ok(creado.id);
  assert.equal(creado.especie, 'colibrí');

  // GET por id -> 200
  res = await pedir(`/avistamientos/${creado.id}`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), creado);

  // PUT -> 200
  res = await pedir(`/avistamientos/${creado.id}`, 'PUT', { ...colibri, lugar: 'Parque Simón Bolívar' });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).lugar, 'Parque Simón Bolívar');

  // DELETE -> 204
  res = await pedir(`/avistamientos/${creado.id}`, 'DELETE');
  assert.equal(res.status, 204);

  // Ya no existe -> 404
  res = await pedir(`/avistamientos/${creado.id}`);
  assert.equal(res.status, 404);
});

test('POST con datos faltantes devuelve 400', async () => {
  const res = await pedir('/avistamientos', 'POST', { especie: 'tucán' });
  assert.equal(res.status, 400);
  assert.ok((await res.json()).detalles.length > 0);
});

test('POST con JSON mal formado devuelve 400', async () => {
  const res = await fetch(base + '/avistamientos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ esto no es json',
  });
  assert.equal(res.status, 400);
});

test('GET, PUT y DELETE sobre un id inexistente devuelven 404', async () => {
  assert.equal((await pedir('/avistamientos/99999')).status, 404);
  assert.equal((await pedir('/avistamientos/99999', 'PUT', colibri)).status, 404);
  assert.equal((await pedir('/avistamientos/99999', 'DELETE')).status, 404);
  assert.equal((await pedir('/avistamientos/abc')).status, 404);
});

test('PUT con datos incompletos devuelve 400', async () => {
  const creado = await (await pedir('/avistamientos', 'POST', colibri)).json();
  const res = await pedir(`/avistamientos/${creado.id}`, 'PUT', { especie: 'garza' });
  assert.equal(res.status, 400);
});

test('GET /avistamientos/resumen cuenta por especie', async () => {
  await pedir('/avistamientos', 'POST', { ...colibri, especie: 'barranquero' });
  await pedir('/avistamientos', 'POST', { ...colibri, especie: 'barranquero' });

  const res = await pedir('/avistamientos/resumen');
  assert.equal(res.status, 200);
  const resumen = await res.json();
  const barranquero = resumen.porEspecie.find((f) => f.especie === 'barranquero');
  assert.equal(barranquero.cantidad, 2);
});
