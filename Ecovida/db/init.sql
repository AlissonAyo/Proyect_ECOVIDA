-- Esquema inicial de EcoVida (ejecutado automáticamente por PostgreSQL en el arranque)
-- Orden respetado por las claves foráneas.

CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    perfil VARCHAR(50) DEFAULT 'usuario',
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE productos (
    id_producto SERIAL PRIMARY KEY,
    nombre VARCHAR(100),
    descripcion TEXT,
    precio DECIMAL(10, 2),
    categoria VARCHAR(50),
    stock_disponible INT NOT NULL DEFAULT 0,
    imagen_url VARCHAR(255),
    creado_en TIMESTAMP DEFAULT NOW()
);

INSERT INTO productos (nombre, descripcion, precio, categoria, stock_disponible) VALUES
('Producto 1', 'Descripción del producto 1', 10.50, 'Categoría A', 3),
('Producto 2', 'Descripción del producto 2', 15.75, 'Categoría B', 3),
('Producto 3', 'Descripción del producto 3', 20.00, 'Categoría A', 3);

CREATE TABLE carrito (
    id_usuario INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario, id_producto),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE
);

CREATE TABLE pedidos (
    id_pedido SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    direccion_entrega VARCHAR(255) NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

CREATE TABLE detalle_pedido (
    id_detalle SERIAL PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
);

CREATE TABLE envios (
    id_envio SERIAL PRIMARY KEY,
    id_pedido INT NOT NULL UNIQUE,
    estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
    direccion_entrega VARCHAR(255) NOT NULL,
    fecha_envio TIMESTAMP DEFAULT NULL,
    fecha_entrega TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE
);
