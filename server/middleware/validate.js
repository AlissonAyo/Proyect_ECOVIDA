import { z } from 'zod';

// ---------- Schemas ----------

// id de ruta: debe ser numérico entero positivo
export const idParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'id debe ser un número entero positivo')
    .transform(Number)
    .refine((n) => n > 0, 'id debe ser mayor a 0'),
});

// Crear producto: name, category y price obligatorios
export const productCreateSchema = z.object({
  name: z.string().trim().min(1, 'name es obligatorio').max(120),
  category: z.string().trim().min(1, 'category es obligatorio').max(80),
  price: z.coerce.number().positive('price debe ser mayor a 0').finite(),
  stock: z.coerce.number().int().min(0).optional(),
});

// Actualizar producto: al menos un campo, todos opcionales
export const productUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    category: z.string().trim().min(1).max(80).optional(),
    price: z.coerce.number().positive('price debe ser mayor a 0').finite().optional(),
    stock: z.coerce.number().int().min(0).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'Debe enviar al menos un campo a actualizar',
  });

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('email inválido').max(254),
  password: z.string().min(8, 'la contraseña debe tener al menos 8 caracteres').max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('email inválido').max(254),
  password: z.string().min(1, 'la contraseña es obligatoria').max(72),
});

// ---------- Middleware ----------

export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: result.error.issues.map((i) => ({
        campo: i.path.join('.'),
        mensaje: i.message,
      })),
    });
  }
  if (source === 'body') req.body = result.data;
  if (source === 'params') req.params = result.data;
  return next();
};
