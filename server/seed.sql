-- ============================================================
-- EcoVida server — Datos de prueba
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================

INSERT INTO ecovida.products (name, category, price, stock) VALUES
('Frutas Orgánicas', 'Frutas y Verduras', 12.99, 100),
('Verduras Frescas', 'Frutas y Verduras', 8.50, 150),
('Granos Naturales', 'Granos y Cereales', 15.75, 80),
('Productos Veganos', 'Vegano', 22.00, 60)
ON CONFLICT DO NOTHING;
