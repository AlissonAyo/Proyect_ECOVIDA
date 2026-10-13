import React, { useState, useEffect } from 'react';
import { API_URL, fetchProducts } from '../api/ecovidaServerApi';

// Demo: lista de productos desde GET /api/products del backend unificado
function ServerProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <h1>Productos desde el backend (/api/products)</h1>
      <p>
        API: <code>{API_URL}</code>
      </p>

      {loading && <p>Cargando productos…</p>}
      {error && (
        <p role="alert" style={{ color: 'red' }}>
          Error: {error}
        </p>
      )}

      {!loading && !error && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {products.map((product) => (
            <li
              key={product.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: '0.75rem 1rem',
                marginBottom: '0.5rem',
              }}
            >
              <strong>{product.name}</strong> — {product.category} — $
              {Number(product.price).toFixed(2)} <span>(stock: {product.stock})</span>
            </li>
          ))}
          {products.length === 0 && (
            <li>No hay productos. Ejecuta seed.sql en la base de datos.</li>
          )}
        </ul>
      )}
    </section>
  );
}

export default ServerProducts;
