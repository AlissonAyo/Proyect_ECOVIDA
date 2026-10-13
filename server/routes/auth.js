import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { validate, registerSchema, loginSchema } from '../middleware/validate.js';

const router = Router();

const BCRYPT_ROUNDS = 10;

// Hash ficticio para igualar el tiempo de respuesta cuando el email no existe
// (mitiga enumeración de usuarios mediante timing)
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-not-a-real-password', BCRYPT_ROUNDS);

// POST /api/auth/register — email + password (hasheado con bcrypt)
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { rows } = await query(
      `INSERT INTO ecovida.users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [email, password_hash]
    );
    return res.status(201).json({
      mensaje: 'Usuario registrado',
      usuario: { id: rows[0].id, email: rows[0].email },
    });
  } catch (err) {
    // Violación de unique (email duplicado)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    return next(err);
  }
});

// POST /api/auth/login — devuelve JWT (expira en 1 hora)
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { rows } = await query(
      'SELECT id, email, password_hash FROM ecovida.users WHERE email = $1',
      [email]
    );
    const user = rows[0];
    const valid = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !valid) {
      // Mismo mensaje genérico para email inexistente o contraseña incorrecta
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'JWT_SECRET no está configurado en el servidor' });
    }
    const token = jwt.sign({ sub: user.id, email: user.email }, secret, { expiresIn: '1h' });
    return res.json({
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: { id: user.id, email: user.email },
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
