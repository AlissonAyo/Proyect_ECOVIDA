import jwt from 'jsonwebtoken';

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Autenticación requerida'
    });
  }

  const token = header.slice(7);

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        error: 'Configuración de seguridad incompleta'
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ['HS256'] }
    );

    if (!decoded.sub || !decoded.email) {
      return res.status(401).json({
        error: 'Token inválido'
      });
    }

    const admins = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean);

    if (!admins.includes(decoded.email.toLowerCase())) {
      return res.status(403).json({
        error: 'Permisos insuficientes'
      });
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      error: 'Token inválido o expirado'
    });
  }
}