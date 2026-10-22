const express = require('express');

const CAMPOS = ['especie', 'lugar', 'fecha', 'observador'];

// Revisa que el cuerpo traiga los cuatro campos como texto no vacío
// y que la fecha tenga formato AAAA-MM-DD y sea una fecha real.
// Devuelve la lista de errores (vacía si todo está bien).

function validarAvistamiento(body, obtenerHoy = () => new Date()) {
  const errores = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return ['El cuerpo debe ser un objeto JSON'];
  }

  for (const campo of CAMPOS) {
    const valor = body[campo];

    if (typeof valor !== 'string' || valor.trim() === '') {
      errores.push(`Falta el campo "${campo}" o está vacío`);
    }
  }

  // La especie debe tener entre 3 y 50 caracteres
  if (typeof body.especie === 'string' && body.especie.trim() !== '') {
    const especie = body.especie.trim();

    if (especie.length < 3 || especie.length > 50) {
      errores.push('La especie debe tener entre 3 y 50 caracteres');
    }
  }

  // La fecha debe existir, tener el formato correcto y no ser futura
  if (typeof body.fecha === 'string' && body.fecha.trim() !== '') {
    const fecha = body.fecha.trim();
    const formatoOk = /^\d{4}-\d{2}-\d{2}$/.test(fecha);
    const d = new Date(`${fecha}T00:00:00Z`);
    const fechaReal =
      formatoOk && !isNaN(d) && d.toISOString().startsWith(fecha);

    if (!fechaReal) {
      errores.push('La fecha debe tener el formato AAAA-MM-DD y ser válida');
    } else {
      const hoy = obtenerHoy();
      const fechaHoy =
        `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

      if (fecha > fechaHoy) {
        errores.push('La fecha no puede ser posterior al día de hoy');
      }
    }
  }

  return errores;
}



// Convierte el :id de la URL a número entero positivo; si no se puede, devuelve null.
function leerId(texto) {
  return /^\d+$/.test(texto) ? Number(texto) : null;
}

function crearApp(db) {
  const app = express();
  app.use(express.json());

  const sql = {
    listar: db.prepare('SELECT * FROM avistamientos ORDER BY id'),
    buscar: db.prepare('SELECT * FROM avistamientos WHERE id = ?'),
    crear: db.prepare(
      'INSERT INTO avistamientos (especie, lugar, fecha, observador) VALUES (?, ?, ?, ?)'
    ),
    actualizar: db.prepare(
      'UPDATE avistamientos SET especie = ?, lugar = ?, fecha = ?, observador = ? WHERE id = ?'
    ),
    eliminar: db.prepare('DELETE FROM avistamientos WHERE id = ?'),
    resumen: db.prepare(
      'SELECT especie, COUNT(*) AS cantidad FROM avistamientos GROUP BY especie ORDER BY cantidad DESC, especie'
    ),
  };

  const noEncontrado = (res) =>
    res.status(404).json({ error: 'Avistamiento no encontrado' });

  // GET /avistamientos -> 200 con la lista
  app.get('/avistamientos', (req, res) => {
    res.status(200).json(sql.listar.all());
  });

  // GET /avistamientos/resumen -> 200 con el conteo por especie (bonus)
  // Va antes de /:id para que "resumen" no se tome como un id.
  app.get('/avistamientos/resumen', (req, res) => {
    const filas = sql.resumen.all();
    const total = filas.reduce((suma, f) => suma + f.cantidad, 0);
    res.status(200).json({ total, porEspecie: filas });
  });

  // GET /avistamientos/:id -> 200 o 404
  app.get('/avistamientos/:id', (req, res) => {
    const id = leerId(req.params.id);
    const avistamiento = id && sql.buscar.get(id);
    if (!avistamiento) return noEncontrado(res);
    res.status(200).json(avistamiento);
  });

  // POST /avistamientos -> 201 con el creado, o 400 si faltan datos
  app.post('/avistamientos', (req, res) => {
    const errores = validarAvistamiento(req.body);
    if (errores.length) return res.status(400).json({ error: 'Datos inválidos', detalles: errores });

    const { especie, lugar, fecha, observador } = req.body;
    const resultado = sql.crear.run(especie.trim(), lugar.trim(), fecha.trim(), observador.trim());
    const creado = sql.buscar.get(Number(resultado.lastInsertRowid));

    res.status(201).location(`/avistamientos/${creado.id}`).json(creado);
  });

  // PUT /avistamientos/:id -> 200 con el actualizado, 404 si no existe, 400 si faltan datos
  // PUT reemplaza el recurso completo, por eso se exigen los cuatro campos.
  app.put('/avistamientos/:id', (req, res) => {
    const id = leerId(req.params.id);
    if (!id || !sql.buscar.get(id)) return noEncontrado(res);

    const errores = validarAvistamiento(req.body);
    if (errores.length) return res.status(400).json({ error: 'Datos inválidos', detalles: errores });

    const { especie, lugar, fecha, observador } = req.body;
    sql.actualizar.run(especie.trim(), lugar.trim(), fecha.trim(), observador.trim(), id);
    res.status(200).json(sql.buscar.get(id));
  });

  // DELETE /avistamientos/:id -> 204 sin cuerpo, o 404 si no existe
  app.delete('/avistamientos/:id', (req, res) => {
    const id = leerId(req.params.id);
    const resultado = id ? sql.eliminar.run(id) : { changes: 0 };
    if (resultado.changes === 0) return noEncontrado(res);
    res.status(204).end();
  });

  // Cualquier otra ruta -> 404 en JSON
  app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  // Manejo de errores: JSON mal formado -> 400; cualquier otro -> 500
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'El cuerpo no es un JSON válido' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}

module.exports = { crearApp, validarAvistamiento };
