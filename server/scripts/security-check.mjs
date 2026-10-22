import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const label = process.argv[2];
if (!['antes', 'despues'].includes(label)) {
  console.error('Uso: node scripts/security-check.mjs antes|despues');
  process.exit(2);
}
mkdirSync('evidencias', { recursive: true });
const results = [];
for (const [name, args] of [
  ['pruebas', ['--test', 'tests/security.test.js']],
]) {
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', env: process.env });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  writeFileSync(`evidencias/${label}-${name}.txt`, output);
  results.push({ name, code: result.status ?? 1 });
  console.log(`\n--- ${name}: ${result.status === 0 ? 'APROBADO' : 'FALLÓ'} ---\n${output}`);
}
const audit = spawnSync('npm', ['audit', '--json', '--audit-level=high'], { encoding: 'utf8', shell: process.platform === 'win32' });
writeFileSync(`evidencias/${label}-npm-audit.json`, audit.stdout ?? '{}');
writeFileSync(`evidencias/${label}-npm-audit-errores.txt`, audit.stderr ?? '');
results.push({ name: 'npm-audit', code: audit.status ?? 1 });
writeFileSync(`evidencias/${label}-resumen.json`, JSON.stringify({date: new Date().toISOString(), node: process.version, baseUrl: process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3001', results}, null, 2));
console.log('\nResumen:', results);
process.exit(results.every((r) => r.code === 0) ? 0 : 1);
