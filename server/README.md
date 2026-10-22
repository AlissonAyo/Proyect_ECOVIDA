# EcoVida Server — Backend Node.js + Express + PostgreSQL

Backend full-stack para EcoVida. API REST con **SQL puro** (driver `pg`, sin ORM),
validación con **zod**, autenticación con **JWT** y **bcrypt**, y seguridad OWASP
(consultas parametrizadas, Helmet, CORS restringido, rate limiting).

- Frontend: https://ecovida-frontend.onrender.com
- Backend (una vez desplegado): https://ecovida-server.onrender.com

## Estructura

```
server/
├── index.js              # App Express: middleware, rutas, manejo de errores
├── db.js                 # Pool de conexión a PostgreSQL (DATABASE_URL + SSL)
├── routes/
│   ├── products.js       # CRUD de productos (ecovida.products)
│   └── auth.js           # register + login (ecovida.users)
├── middleware/
│   └── validate.js       # Schemas zod + middleware de validación
├── schema.sql            # CREATE SCHEMA ecovida + tablas
├── seed.sql              # 4 productos de ejemplo
├── requests.rest         # Pruebas con REST Client de VS Code
├── package.json          # "type": "module" (ESM)
├── .env.example          # Plantilla de variables de entorno
└── .env                  # Tus valores reales (NO se sube a git)
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (Render asigna uno automáticamente; local: 3001) |
| `DATABASE_URL` | Cadena de conexión de PostgreSQL (**Internal Database URL** de Render) |
| `DB_SSL` | `true` en Render; vacío/`false` para Postgres local sin SSL |
| `JWT_SECRET` | Secreto largo y aleatorio para firmar JWT. **Nunca lo subas a git** |
| `CORS_ORIGIN` | Origen permitido (p. ej. `https://ecovida-frontend.onrender.com`); varios separados por coma |

### Sobre SSL (`rejectUnauthorized: false`)

En Render, `DB_SSL=true` activa `ssl: { rejectUnauthorized: false }`. Esto
**desactiva la validación estricta del certificado del servidor PostgreSQL**.
Es un *trade-off consciente y documentado*: los certificados de Render Postgres
son gestionados internamente por su infraestructura y el tráfico viaja por la
red privada de Render. Si en el futuro usas un Postgres con certificado propio
(validable contra una CA estándar), cambia a validación estricta.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Health check. **Siempre 200**: `{ status, db: 'ok'\|'error', timestamp }` |
| GET | `/api/products` | Lista todos los productos |
| GET | `/api/products/:id` | Producto por ID (id debe ser numérico → 400 si no) |
| POST | `/api/products` | Crea producto (`name`, `category`, `price` obligatorios) |
| PUT | `/api/products/:id` | Actualiza campos enviados |
| DELETE | `/api/products/:id` | Elimina producto |
| POST | `/api/auth/register` | Registra usuario (bcrypt, 409 si el email existe) |
| POST | `/api/auth/login` | Devuelve JWT (expira en 1 hora) |

Todas las respuestas de `/api/health` son **200 incluso si la BD falla**
(`db: "error"`) para que Render no reinicie el servicio por un fallo temporal.

### Endpoint TEMPORAL de reset (staging/pentesting)

| Método | Ruta | Condición de activación |
|---|---|---|
| POST | `/api/_debug/reset-seed` | Solo si `NODE_ENV=development` **o** `STAGING_MODE=true` |

- Ejecuta `TRUNCATE ecovida.products RESTART IDENTITY` + INSERT de los 4
  productos de seed en una transacción. Sirve para restaurar el catálogo tras
  pruebas destructivas del pentesting (ver `PENTESTING-EJECUCION.md`).
- **NO existe en producción** si `NODE_ENV=production` y `STAGING_MODE` no está
  definida (la ruta responde 404).
- **ANTES DE PASAR A PRODUCCIÓN:** eliminar el endpoint por completo — borrar
  `routes/debug.js` y el bloque condicional de montaje en `index.js` (busca
  `ELIMINAR ESTE BLOQUE`). Como defensa en profundidad, jamás definir
  `STAGING_MODE` en el Web Service de producción.

## Seguridad implementada (OWASP)

- **Consultas parametrizadas siempre** (`$1, $2…`); nunca concatenación de strings.
  En `PUT` los nombres de columna provienen de una **allowlist fija**; los valores
  van parametrizados.
- **Schema propio `ecovida`**: las tablas `ecovida.products` y `ecovida.users` NO
  viven en `public` para no colisionar con las tablas de los 5 microservicios
  existentes (`usuarios`, `productos`, `carrito`, `pedidos`, `envios`) que sí
  usan `public`. Todas las consultas van totalmente calificadas.
- **Validación de entrada con zod** en todos los endpoints (tipos, longitudes,
  formatos).
- **bcrypt** (10 rondas) para contraseñas — nunca texto plano.
- **JWT** con expiración de 1 hora; `JWT_SECRET` fuera del repositorio.
- **Rate limiting**: global 100 req/min por IP; estricto 10 req/15 min en `/api/auth/*`.
- **Helmet** (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, etc.).
- **CORS** restringido al dominio del frontend (`CORS_ORIGIN`).
- **Errores centralizados**: sin stack traces en respuestas; JSON inválido → 400.
- **Mitigación de enumeración** en login: mensaje idéntico y tiempo de respuesta
  igualado (hash ficticio) para email inexistente vs. contraseña incorrecta.
- `express.json({ limit: '10kb' })` contra abuso de payloads.

## Correr localmente

1. Copia la plantilla y edita valores:
   ```bash
   cp .env.example .env
   ```
2. Instala dependencias:
   ```bash
   npm install
   ```
3. Crea las tablas y el seed en tu Postgres local (o usa la BD de Render):
   ```bash
   psql "$DATABASE_URL" -f schema.sql
   psql "$DATABASE_URL" -f seed.sql
   ```
4. Arranca:
   ```bash
   npm start
   ```
5. Prueba: abre `requests.rest` con la extensión **REST Client** de VS Code, o:
   ```bash
   curl http://localhost:3001/api/health
   curl http://localhost:3001/api/products
   ```

## Despliegue en Render

### 1) Crear la base de datos PostgreSQL en Render

1. En Render: **New → PostgreSQL** (o reutiliza la existente `ecovida-db` del blueprint).
2. Plan: **Free**. Nombre sugerido: `ecovida-db` (ya existe en este proyecto → úsala).
3. Espera a que el estado sea **Available**.

### 2) Copiar la Internal Database URL

1. Entra a la BD → pestaña **Connections**.
2. Copia el valor de **Internal Database URL** (empieza con `postgresql://…@…render.com…`).
3. El backend usa la URL *interna* porque el Web Service y la BD están en la misma
   red de Render. La *External* solo sirve desde tu máquina local.

### 3) Ejecutar schema.sql y seed.sql

En la consola SQL de Render (pestaña **Data > Query** de la BD):

1. Copia y ejecuta el contenido completo de `schema.sql` (crea el schema `ecovida`
   y las tablas `products` y `users`).
2. Copia y ejecuta el contenido de `seed.sql` (4 productos de ejemplo).

Verificación:
```sql
SELECT * FROM ecovida.products;
```

### 4) Crear el Web Service del backend

1. **New → Web Service** → conecta este repositorio.
2. Configuración:
   | Campo | Valor |
   |---|---|
   | Name | `ecovida-server` |
   | Root Directory | `server` |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Health Check Path | `/api/health` |
   | Instance Type | Free |
3. **Environment** (dashboard del servicio):
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Internal Database URL copiada en el paso 2 |
   | `DB_SSL` | `true` |
   | `CORS_ORIGIN` | `https://ecovida-frontend.onrender.com` |
   | `JWT_SECRET` | Genera uno: `openssl rand -hex 32` y pégalo (**sync: false** en el blueprint; se configura manualmente, nunca en el repo) |
4. **Create Web Service**. El deploy tarda ~2-5 min.
5. Verifica: `https://ecovida-server.onrender.com/api/health` →
   `{ "status": "ok", "db": "ok", … }`

### 5) Conexión con el frontend

- Variable `REACT_APP_API_URL=https://ecovida-server.onrender.com` ya agregada en
  `render.yaml` para el frontend (o en su dashboard).
- El frontend lee: `window.API_URL || process.env.REACT_APP_API_URL || 'http://localhost:3001'`.
- Demo en vivo: ruta **`/demo-api`** lista productos desde `GET /api/products` con `fetch`.

## Mantenimiento de dependencias

Ejecuta regularmente **dentro de `server/`**:

```bash
npm audit          # vulnerabilidades reportadas por el advisory de npm
npm audit fix      # aplica parches compatibles con tu rango de versiones
npm outdated       # dependencias desactualizadas
```

- `npm audit` con severidad **high/critical** debe resolverse antes de desplegar.
- Tras actualizar dependencias, haz deploy de prueba y corre `requests.rest` completo.
- No ignores `package-lock.json`: fija las versiones exactas auditadas.

## Pruebas de seguridad (post-despliegue)

> **ADVERTENCIA**: ejecuta pruebas activas SOLO contra un entorno de **staging**.
> **NUNCA** against producción — un scan activo puede alterar datos, saturar el
> plan gratuito o considerarse abuso.

- Endpoint de staging sugerido: `https://ecovida-server-staging.onrender.com`
  (clona el servicio y apúntalo a una BD de staging, o usa `http://localhost:3001`).

### Herramientas

| Herramienta | Uso | Regla |
|---|---|---|
| **OWASP ZAP** | Baseline scan passivo: cabeceras, cookies, configuración | Solo staging |
| **sqlmap** | Inyección SQL automatizada contra `id`, `name`, `email` | **Solo staging**, con permiso |
| **hey** | Carga para verificar rate limiting (`hey -n 30 http://staging…/api/health`) | Staging o local |
| **curl -I** | Checklist manual de cabeceras | Staging o local |

Ejemplos:
```bash
# Rate limiting global (espera 429 tras 100 req)
hey -n 150 -c 5 https://ecovida-server-staging.onrender.com/api/health

# Rate limiting de auth (espera 429 tras 10 intentos en 15 min)
hey -n 15 -c 1 -m POST https://ecovida-server-staging.onrender.com/api/auth/login

# sqlmap SOLO en staging (nunca en producción)
sqlmap -u "https://ecovida-server-staging.onrender.com/api/products/1" --batch --level=3
```

### Checklist de cabeceras (`curl -I https://…/api/health`)

| Cabecera | Esperado | Origen |
|---|---|---|
| `Strict-Transport-Security` | presente (HSTS) | Helmet |
| `Content-Security-Policy` | presente (default Helmet) | Helmet |
| `X-Frame-Options` | `SAMEORIGIN` | Helmet |
| `X-Content-Type-Options` | `nosniff` | Helmet |
| `Referrer-Policy` | presente | Helmet |

Nota: detrás del proxy de Render algunas cabeceras pueden gestionarse a nivel de
edge; verifica siempre con `curl -I` contra el dominio desplegado.

### Ataques OWASP a probar (14)

| # | Ataque | ¿Aplica a este backend? | Cómo se prueba / mitigación |
|---|---|---|---|
| 1 | SQL Injection | **Sí** | sqlmap en staging contra `/api/products/:id` y body de POST/PUT; mitigado con consultas parametrizadas |
| 2 | Broken Access Control / IDOR | **Sí** | CRUD público sin autenticación (diseño del ejercicio): verificar que no se exponen más campos de los necesarios; futura mejora: proteger POST/PUT/DELETE con JWT de admin |
| 3 | Broken Authentication | **Sí** | `hey` contra `/api/auth/login` (429 tras 10); contraseñas bcrypt; JWT exp 1h |
| 4 | Cryptographic Failures | **Sí** | Verificar que no hay contraseñas en claro (`SELECT * FROM ecovida.users` solo muestra hash) y que DB usa SSL en tránsito |
| 5 | Security Misconfiguration | **Sí** | `curl -I` (checklist de cabeceras); revisar que `.env` no está en git; CORS solo permite el frontend |
| 6 | Vulnerable and Outdated Components | **Sí** | `npm audit` y `npm outdated` en `server/` |
| 7 | Injection (XSS/reflejado en API) | **Parcial** | API responde JSON; el riesgo de XSS vive en el frontend React (React escapa por defecto). Verificar `Content-Type: application/json` |
| 8 | Software and Data Integrity Failures | **Parcial** | Sin CI/CD ni deserialización de objetos; dependencias fijadas con `package-lock.json` |
| 9 | Logging and Monitoring Failures | **Sí** | El error handler loguea en servidor y nunca filtra stack traces al cliente; revisar logs de Render |
| 10 | CSRF | **Bajo** | Autenticación por header `Authorization: Bearer` (no cookies), por lo que el navegador no adjunta credenciales automáticamente |
| 11 | SSRF | **No aplica** | El backend no hace peticiones a URLs proporcionadas por el usuario |
| 12 | XXE | **No aplica** | Solo se acepta JSON (`express.json`), no XML |
| 13 | Insecure Deserialization | **No aplica** | Sin deserialización de objetos; solo JSON plano |
| 14 | Components with Known Vulnerabilities (transitivas) | **Sí** | Cubierto por `npm audit`; repetir tras cada actualización |

## Advertencias del plan gratuito de Render

- **PostgreSQL Free expira a los 30 días** desde su creación. Tras expirar hay
  **14 días de gracia** para subir a un plan de pago; si no, Render **borra la
  BD con todos sus datos**. Render avisa por email antes de cada fecha.
- **Web Services Free se suspenden a los 15 minutos sin tráfico** (spin-down);
  el primer request tarda ~1 minuto en responder.
- **750 horas free por mes**: si se agotan, los servicios quedan suspendidos
  hasta el inicio del siguiente mes.
- 1 GB de almacenamiento, **sin backups**, mantenimientos ocasionales.
- Recomendación para el curso: ten listo `schema.sql` + `seed.sql` para recrear
  la BD rápida si expira, o haz upgrade a un plan de pago antes del vencimiento.

## Análisis de dependencias y Supply Chain

### Resultados de npm audit (fecha 12/10/2026)

Total: 2 vulnerabilidades

- 1 critical (tar <= 7.5.20) — GHSA-34x7-hfp2-rc4v + 10 avisos relacionados
- 1 high (@mapbox/node-pre-gyp <= 1.0.11) — hereda la vulnerabilidad de tar
- 0 moderate, 0 low

Cadena afectada:

```
bcrypt@5.1.1 → @mapbox/node-pre-gyp@1.0.11 → tar@6.2.1
```

### Análisis de explotabilidad

Contexto: ambas vulnerabilidades viven en la cadena de INSTALACIÓN de bcrypt
(descarga y extracción del binario nativo), NO en el runtime de la API.

- El backend nunca ejecuta tar ni node-pre-gyp al servir peticiones.
- Solo se usan `bcrypt.hash()` y `bcrypt.compare()`, que son código compilado.
- La vulnerabilidad de tar (path traversal / symlink poisoning al extraer
  tarballs) solo se explota si:
  - a) Un atacante controla el tarball descargado durante npm install
    (implica compromiso del registry npm), o
  - b) La aplicación ejecuta tar sobre input no confiable (no es el caso).

### Decisión: no aplicar fix

- `npm audit fix`: puede subir tar dentro de ^6.1.11, pero si requiere tar 7.x
  rompe node-pre-gyp 1.x.
- `npm audit fix --force`: migraría a bcrypt 6, que tiene breaking changes en el
  binding nativo.
- Decisión: mantener bcrypt 5.1.1 por estabilidad y auditar manualmente.

### Mitigaciones aplicadas

1. `package-lock.json` commiteado con integrity sha512 verificada por npm →
   cualquier alteración del paquete es detectada en el próximo install.
2. Versiones exactas fijadas (sin rangos ^) en package.json → builds reproducibles.
3. `npm audit` ejecutado como parte del flujo de revisión.
4. `npm outdated` ejecutado para identificar majors más nuevos (Express 5,
   zod 4, bcrypt 6) y decidir conscientemente no actualizar.

### Recomendaciones futuras

- Reevaluar cuando bcrypt 6.x estabilice su API.
- Monitorear advisories de tar y node-pre-gyp por si aparece un fix retrocompatible.
- Considerar alternativas a bcrypt (argon2) que no dependan de node-pre-gyp.

Este análisis corresponde al ataque 'Supply Chain Attack' (Componentes Vulnerables
y Desactualizados, A06:2021 en OWASP Top 10) de la tabla de pruebas de seguridad
incluida más arriba.
