-- ============================================================
-- EcoVida server — Esquema de base de datos (PostgreSQL)
--
-- IMPORTANTE: las tablas nuevas viven en el schema propio `ecovida`
-- para no colisionar con las tablas de los microservicios existentes
-- que viven en el schema `public` (usuarios, productos, carrito, etc.).
-- Todas las consultas del backend usan siempre ecovida.products /
-- ecovida.users (totalmente calificados).
-- ============================================================

CREATE SCHEMA IF NOT EXISTS ecovida;

CREATE TABLE IF NOT EXISTS ecovida.products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    price NUMERIC(10, 2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ecovida.users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
