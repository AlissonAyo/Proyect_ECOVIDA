import { Router } from 'express';
import { query } from '../db.js';
import {
  validate,
  idParamSchema,
  productCreateSchema,
  productUpdateSchema,
} from '../middleware/validate.js';

const router = Router();

// Todas las consultas usan el schema propio ecovida (nunca public)
const SELECT_COLUMNS = 'id, name, category, price, stock, created_at';

// pg devuelve NUMERIC como string: convertimos price a number
const rowToProduct = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  price: Number(row.price),
  stock: row.stock,
  created_at: row.created_at,
});

// GET /api/products — listar todos
router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ${SELECT_COLUMNS} FROM ecovida.products ORDER BY id ASC`
    );
    res.json(rows.map(rowToProduct));
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id — obtener uno (id numérico validado)
router.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ${SELECT_COLUMNS} FROM ecovida.products WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    return res.json(rowToProduct(rows[0]));
  } catch (err) {
    return next(err);
  }
});

// POST /api/products — crear
router.post('/', validate(productCreateSchema), async (req, res, next) => {
  try {
    const { name, category, price, stock } = req.body;
    const { rows } = await query(
      `INSERT INTO ecovida.products (name, category, price, stock)
       VALUES ($1, $2, $3, $4)
       RETURNING ${SELECT_COLUMNS}`,
      [name, category, price, stock ?? 0]
    );
    return res.status(201).json(rowToProduct(rows[0]));
  } catch (err) {
    return next(err);
  }
});

// PUT /api/products/:id — actualizar (solo campos de allowlist; valores parametrizados)
const UPDATABLE_COLUMNS = ['name', 'category', 'price', 'stock'];

router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(productUpdateSchema),
  async (req, res, next) => {
    try {
      const fields = Object.keys(req.body).filter((f) => UPDATABLE_COLUMNS.includes(f));
      if (fields.length === 0) {
        return res.status(400).json({ error: 'Nada que actualizar' });
      }
      // Nombres de columna desde allowlist fija (nunca input del usuario);
      // valores siempre parametrizados ($1..$n)
      const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
      const values = fields.map((f) => req.body[f]);
      const { rows } = await query(
        `UPDATE ecovida.products SET ${setClause} WHERE id = $${fields.length + 1}
         RETURNING ${SELECT_COLUMNS}`,
        [...values, req.params.id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      return res.json(rowToProduct(rows[0]));
    } catch (err) {
      return next(err);
    }
  }
);

// DELETE /api/products/:id — eliminar
router.delete('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    const { rowCount } = await query('DELETE FROM ecovida.products WHERE id = $1', [
      req.params.id,
    ]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    return res.json({ mensaje: 'Producto eliminado', id: req.params.id });
  } catch (err) {
    return next(err);
  }
});

export default router;
