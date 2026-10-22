import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3001';
const url = new URL(BASE_URL);
const hostPermitido = [
  'localhost',
  '127.0.0.1',
  '[::1]',
  'ecovida-server-staging.onrender.com'
];

if (!hostPermitido.includes(url.hostname)) {
  throw new Error('Servidor no autorizado para las pruebas.');
}
if (process.env.ECOVIDA_TEST_DB !== 'true') {
  throw new Error('Configure ECOVIDA_TEST_DB=true únicamente si el backend usa una BD aislada de pruebas.');
}

const payload = { name: 'PRUEBA-SEGURIDAD-NO-PRODUCCION', category: 'prueba', price: 1, stock: 1 };

async function request(method, path, body) {
  const res = await fetch(new URL(path, BASE_URL), {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const text = await res.text();
  return { status: res.status, body: text.slice(0, 500) };
}

test('PA01: una persona anónima no puede crear productos', async () => {
  const result = await request('POST', '/api/products', payload);
  assert.equal(result.status, 401, `Resultado inesperado: ${JSON.stringify(result)}`);
});

test('PA02: una persona anónima no puede modificar productos', async () => {
  const result = await request('PUT', '/api/products/1', { price: 2 });
  assert.equal(result.status, 401, `Resultado inesperado: ${JSON.stringify(result)}`);
});

test('PA03: una persona anónima no puede eliminar productos', async () => {
  const result = await request('DELETE', '/api/products/1');
  assert.equal(result.status, 401, `Resultado inesperado: ${JSON.stringify(result)}`);
});
