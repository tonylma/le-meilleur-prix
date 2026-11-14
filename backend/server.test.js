import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp, validatePrice } from './server.js';

let directory;
let server;
let baseUrl;

before(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'meilleur-prix-'));
  const app = createApp({ dbPath: path.join(directory, 'db.json'), frontendDistPath: path.join(directory, 'missing-dist') });
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
  await rm(directory, { recursive: true, force: true });
});

test('validatePrice normalizes fields and rejects invalid prices', () => {
  const valid = validatePrice({ productName: '  Riz  ', price: '750', unit: 'kg', store: { type: 'Marché', name: 'Marché Central' }, location: { city: 'Bouaké' } });
  assert.equal(valid.productName, 'Riz');
  assert.equal(valid.pseudo, 'Anonyme');
  assert.throws(() => validatePrice({ productName: 'Riz', price: -1, unit: 'kg', store: {}, location: {} }), { status: 400 });
});

test('API accepts valid prices, filters results, and rejects oversized input', async () => {
  const payload = { productName: 'Riz', price: 750, unit: 'kg', store: { type: 'Marché', name: 'Marché Central' }, location: { city: 'Bouaké', neighborhood: 'Centre' } };
  const created = await fetch(`${baseUrl}/api/prices`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  assert.equal(created.status, 201);
  assert.equal((await created.json()).productName, 'Riz');
  const result = await fetch(`${baseUrl}/api/prices?product=riz&city=bouak%C3%A9`);
  assert.equal((await result.json()).length, 1);
  const invalid = await fetch(`${baseUrl}/api/prices`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, price: 0 }) });
  assert.equal(invalid.status, 400);
});

test('API returns aggregate stats for a product', async () => {
  const response = await fetch(`${baseUrl}/api/stats/Riz?city=Bouak%C3%A9`);
  const stats = await response.json();
  assert.equal(stats.data.length, 1);
  assert.equal(stats.data[0], 750);
});
