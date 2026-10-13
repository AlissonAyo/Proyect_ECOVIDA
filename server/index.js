import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import productsRouter from './routes/products.js';
import authRouter from './routes/auth.js';
import { verifyDb } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Render detrás de proxy: necesario para IP real en rate limiting
app.set('trust proxy', 1);

// Cabeceras de seguridad (Helmet 8: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, etc.)
app.use(helmet());

app.use(express.json({ limit: '10kb' }));

// CORS: solo los orígenes configurados en CORS_ORIGIN (coma-separados)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Sin Origin (curl, health checks, apps móviles): se permite
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limit global suave: 100 peticiones/min por IP (mitigación de abuso a nivel de app)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intente de nuevo en un minuto.' },
});

// Rate limit estricto en autenticación: 10 intentos/15 min por IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos de autenticación. Intente de nuevo en 15 minutos.',
  },
});

app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);

// GET /api/health — SIEMPRE 200 (Render no debe reiniciar el servicio por un fallo temporal de BD)
app.get('/api/health', async (_req, res) => {
  let db = 'ok';
  try {
    await verifyDb();
  } catch {
    db = 'error';
  }
  res.status(200).json({ status: 'ok', db, timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  res.json({ mensaje: 'API EcoVida (server). Endpoints: /api/products, /api/auth, /api/health' });
});

app.use('/api/products', productsRouter);
app.use('/api/auth', authRouter);

// 404 JSON
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo centralizado de errores: nunca exponer stack traces
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido en el cuerpo de la petición' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`EcoVida server escuchando en el puerto ${PORT}`);
});
