# API de avistamientos de aves

API REST para registrar avistamientos de aves observadas en campo. Trabajo en clase de Ingeniería de Software 2 (ISW-2), Sesión 17.

**Autor:** Juan Sebastián Morales Herrera

## Tecnologías

- **Node.js** (versión 22.13 o superior)
- **Express** para el servidor HTTP
- **SQLite** con el módulo integrado de Node `node:sqlite` (no hay que instalar nada aparte para la base de datos)
- **node:test** para las pruebas (también integrado en Node)

## Instalación y ejecución

1. Tener instalado [Node.js](https://nodejs.org/) 22.13 o superior. Para verificar:

   ```bash
   node --version
   ```

2. Clonar el repositorio y entrar a la carpeta:

   ```bash
   git clone <URL-DEL-REPOSITORIO>
   cd api-avistamientos
   ```

3. Instalar las dependencias:

   ```bash
   npm install
   ```

4. Levantar la API:

   ```bash
   npm start
   ```

   La API queda escuchando en `http://localhost:3000`. La primera vez se crea automáticamente el archivo `avistamientos.db` con la tabla vacía.

   Para usar otro puerto: `PORT=4000 npm start` (en PowerShell: `$env:PORT=4000; npm start`).

> Al arrancar, Node puede mostrar el aviso `ExperimentalWarning: SQLite is an experimental feature`. Es normal y no afecta el funcionamiento.

## Pruebas

```bash
npm test
```

Se ejecutan pruebas unitarias (validación de datos) y de integración (peticiones HTTP reales a cada endpoint, usando una base de datos en memoria para no tocar `avistamientos.db`).

## El recurso: avistamiento

```json
{
  "id": 1,
  "especie": "colibrí",
  "lugar": "Humedal La Conejera, Bogotá",
  "fecha": "2026-09-29",
  "observador": "Sebastián Morales"
}
```

| Campo        | Tipo   | Notas                                   |
|--------------|--------|-----------------------------------------|
| `id`         | número | Lo asigna el sistema                    |
| `especie`    | texto  | Obligatorio                             |
| `lugar`      | texto  | Obligatorio                             |
| `fecha`      | texto  | Obligatorio, formato `AAAA-MM-DD`       |
| `observador` | texto  | Obligatorio                             |

## Endpoints

| Método | Ruta                       | Qué hace                         | Respuestas         |
|--------|----------------------------|----------------------------------|--------------------|
| GET    | `/avistamientos`           | Lista todos los avistamientos    | 200                |
| GET    | `/avistamientos/{id}`      | Muestra un avistamiento          | 200, 404           |
| POST   | `/avistamientos`           | Registra un avistamiento         | 201, 400           |
| PUT    | `/avistamientos/{id}`      | Reemplaza un avistamiento        | 200, 400, 404      |
| DELETE | `/avistamientos/{id}`      | Elimina un avistamiento          | 204, 404           |
| GET    | `/avistamientos/resumen`   | Cantidad por especie (bonus)     | 200                |

Los errores siempre responden en JSON, por ejemplo: `{ "error": "Avistamiento no encontrado" }`.

## Ejemplos con curl

> Los ejemplos están escritos para una terminal tipo bash (Linux, macOS o **Git Bash** en Windows). En PowerShell las comillas del JSON se manejan distinto, por eso se recomienda Git Bash.

### Registrar un avistamiento — `POST /avistamientos`

```bash
curl -i -X POST http://localhost:3000/avistamientos \
  -H "Content-Type: application/json" \
  -d '{"especie":"colibrí","lugar":"Humedal La Conejera, Bogotá","fecha":"2026-09-29","observador":"Sebastián Morales"}'
```

Respuesta `201 Created`:

```json
{"id":1,"especie":"colibrí","lugar":"Humedal La Conejera, Bogotá","fecha":"2026-09-29","observador":"Sebastián Morales"}
```

Si faltan datos, responde `400 Bad Request`:

```bash
curl -i -X POST http://localhost:3000/avistamientos \
  -H "Content-Type: application/json" \
  -d '{"especie":"tucán"}'
```

```json
{"error":"Datos inválidos","detalles":["Falta el campo \"lugar\" o está vacío","Falta el campo \"fecha\" o está vacío","Falta el campo \"observador\" o está vacío"]}
```

### Listar todos — `GET /avistamientos`

```bash
curl -i http://localhost:3000/avistamientos
```

Respuesta `200 OK` con un arreglo de avistamientos.

### Ver uno — `GET /avistamientos/{id}`

```bash
curl -i http://localhost:3000/avistamientos/1
```

Respuesta `200 OK` con el avistamiento, o `404 Not Found` si no existe.

### Actualizar — `PUT /avistamientos/{id}`

PUT reemplaza el recurso completo, así que se envían los cuatro campos.

```bash
curl -i -X PUT http://localhost:3000/avistamientos/1 \
  -H "Content-Type: application/json" \
  -d '{"especie":"colibrí","lugar":"Parque Simón Bolívar","fecha":"2026-09-30","observador":"Sebastián Morales"}'
```

Respuesta `200 OK` con el avistamiento actualizado, `404` si no existe o `400` si faltan datos.

### Eliminar — `DELETE /avistamientos/{id}`

```bash
curl -i -X DELETE http://localhost:3000/avistamientos/1
```

Respuesta `204 No Content` (sin cuerpo), o `404 Not Found` si no existe.

### Resumen por especie (bonus) — `GET /avistamientos/resumen`

```bash
curl -i http://localhost:3000/avistamientos/resumen
```

Respuesta `200 OK`:

```json
{"total":3,"porEspecie":[{"especie":"barranquero","cantidad":2},{"especie":"colibrí","cantidad":1}]}
```

## Estructura del proyecto

```
api-avistamientos/
├── src/
│   ├── app.js       # Rutas, validación y códigos de estado
│   ├── db.js        # Conexión a SQLite y creación de la tabla
│   └── server.js    # Punto de entrada: abre la base y levanta el servidor
├── test/
│   └── api.test.js  # Pruebas unitarias y de integración
├── package.json
└── README.md
```

## Uso de IA

Para este trabajo usé **Claude** (Anthropic), modelo **Claude Opus 5.5**, como apoyo para escribir el código, las pruebas y este README. Revisé y entiendo el código publicado.

## Referencias

- [Documentación de Express](https://expressjs.com/)
- [Documentación de `node:sqlite`](https://nodejs.org/api/sqlite.html)
- [Documentación de `node:test`](https://nodejs.org/api/test.html)
