// src/api/ecovidaServerApi.js
// Consumo del backend unificado (server/) vía fetch nativo.
// URL del backend: window.API_URL > REACT_APP_API_URL > localhost

export const API_URL =
  (typeof window !== 'undefined' && window.API_URL) ||
  process.env.REACT_APP_API_URL ||
  'http://localhost:3001';

// GET /api/products — listar productos desde el backend nuevo
export async function fetchProducts() {
  const response = await fetch(`${API_URL}/api/products`);
  if (!response.ok) {
    throw new Error(`Error ${response.status}: no se pudieron cargar los productos`);
  }
  return response.json();
}

// GET /api/products/:id — obtener un producto por ID
export async function fetchProductById(id) {
  const response = await fetch(`${API_URL}/api/products/${id}`);
  if (!response.ok) {
    throw new Error(`Error ${response.status}: producto no encontrado`);
  }
  return response.json();
}
