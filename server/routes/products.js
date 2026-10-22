
import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/authorize.js';
import {
  validate,
  idParamSchema,
  productCreateSchema,
  productUpdateSchema,
} from '../middleware/validate.js';

const router = Router();

// Columnas permitidas para consultar productos
const SELECT_COLUMNS = 'id, name, category, price, stock, created_at';

// Convertir el precio de PostgreSQL a número
const rowToProduct = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  price: Number(row.price),
  stock: row.stock,
  created_at: row.created_at,
});

// GET /api/products
// Consultar todos los productos (acceso público)
router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ${SELECT_COLUMNS}
       FROM ecovida.products
       ORDER BY id ASC`
    );

    return res.json(rows.map(rowToProduct));
  } catch (err) {
    return next(err);
  }
});

// GET /api/products/:id
// Consultar un producto (acceso público)
router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const { rows } = await query(
        `SELECT ${SELECT_COLUMNS}
         FROM ecovida.products
         WHERE id = $1`,
        [req.params.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          error: 'Producto no encontrado'
        });
      }

      return res.json(rowToProduct(rows[0]));
    } catch (err) {
      return next(err);
    }
  }
);

// POST /api/products
// Crear productos (solo administradores)
router.post(
  '/',
  requireAdmin,
  validate(productCreateSchema),
  async (req, res, next) => {
    try {
      const { name, category, price, stock } = req.body;

      const { rows } = await query(
        `INSERT INTO ecovida.products
         (name, category, price, stock)
         VALUES ($1, $2, $3, $4)
         RETURNING ${SELECT_COLUMNS}`,
        [name, category, price, stock ?? 0]
      );

      return res.status(201).json(
        rowToProduct(rows[0])
      );
    } catch (err) {
      return next(err);
    }
  }
);

// Campos permitidos para actualizar
const UPDATABLE_COLUMNS = [
  'name',
  'category',
  'price',
  'stock'
];

// PUT /api/products/:id
// Actualizar productos (solo administradores)
router.put(
  '/:id',
  requireAdmin,
  validate(idParamSchema, 'params'),
  validate(productUpdateSchema),
  async (req, res, next) => {
    try {
      const fields = Object.keys(req.body).filter(
        (field) => UPDATABLE_COLUMNS.includes(field)
      );

      if (fields.length === 0) {
        return res.status(400).json({
          error: 'Nada que actualizar'
        });
      }

      const setClause = fields
        .map((field, index) => `${field} = $${index + 1}`)
        .join(', ');

      const values = fields.map(
        (field) => req.body[field]
      );

      const { rows } = await query(
        `UPDATE ecovida.products
         SET ${setClause}
         WHERE id = $${fields.length + 1}
         RETURNING ${SELECT_COLUMNS}`,
        [...values, req.params.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          error: 'Producto no encontrado'
        });
      }

      return res.json(rowToProduct(rows[0]));
    } catch (err) {
      return next(err);
    }
  }
);

// DELETE /api/products/:id
// Eliminar productos (solo administradores)
router.delete(
  '/:id',
  requireAdmin,
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const { rowCount } = await query(
        `DELETE FROM ecovida.products
         WHERE id = $1`,
        [req.params.id]
      );

      if (rowCount === 0) {
        return res.status(404).json({
          error: 'Producto no encontrado'
        });
      }

      return res.json({
        mensaje: 'Producto eliminado',
        id: req.params.id
      });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
