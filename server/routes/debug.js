import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// 4 productos de seed (mismos que seed.sql)
const SEED_PRODUCTS = [
  ['Frutas Orgánicas', 'Frutas y Verduras', 12.99, 100],
  ['Verduras Frescas', 'Frutas y Verduras', 8.50, 150],
  ['Granos Naturales', 'Granos y Cereales', 15.75, 80],
  ['Productos Veganos', 'Vegano', 22.00, 60],
];

// POST /api/_debug/reset-seed
// Restaura el catálogo tras pruebas destructivas (DELETE/UPDATE) del pentesting.
// SOLO está montado si NODE_ENV=development o STAGING_MODE=true (ver index.js).
// ELIMINAR ESTE ARCHIVO Y SU MONTAJE ANTES DE PRODUCCIÓN.
router.post('/reset-seed', async (_req, res, next) => {
  // Transacción explícita: hay que usar un solo cliente del pool
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE ecovida.products RESTART IDENTITY');
    for (const [name, category, price, stock] of SEED_PRODUCTS) {
      await client.query(
        'INSERT INTO ecovida.products (name, category, price, stock) VALUES ($1, $2, $3, $4)',
        [name, category, price, stock]
      );
    }
    await client.query('COMMIT');
    return res.json({
      mensaje: 'Seed restaurado correctamente',
      productos_restaurados: SEED_PRODUCTS.length,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return next(err);
  } finally {
    client.release();
  }
});

export default router;
