import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { openStorage, loadDrawing, saveDrawing } from './storage.js';

beforeEach(() => { globalThis.indexedDB = new IDBFactory(); });

const content = JSON.stringify({
  type: 'excalidraw',
  elements: [{ id: 'image', type: 'image', fileId: 'file' }],
  appState: { viewBackgroundColor: '#ffffff', zoom: { value: 1.5 } },
  files: { file: { id: 'file', mimeType: 'image/png', dataURL: 'data:image/png;base64,aGVsbG8=' } },
  libraryItems: [{ id: 'template', elements: [{ id: 'box', type: 'rectangle' }] }]
});

test('restores the drawing, images, view and library after reopening', async () => {
  const db = await openStorage();
  assert.equal(await loadDrawing(db), undefined);
  assert.equal(await saveDrawing(db, content, 0), 1);
  db.close();
  const reopened = await openStorage();
  assert.deepEqual(await loadDrawing(reopened), { content, revision: 1 });
  reopened.close();
});

test('refuses a stale tab without overwriting the last good drawing', async () => {
  const first = await openStorage();
  const second = await openStorage();
  await saveDrawing(first, content, 0);
  await assert.rejects(saveDrawing(second, 'stale', 0), { name: 'VersionError' });
  assert.deepEqual(await loadDrawing(first), { content, revision: 1 });
  await saveDrawing(first, 'updated', 1);
  assert.deepEqual(await loadDrawing(first), { content: 'updated', revision: 2 });
  first.close();
  second.close();
});

test('a failed write preserves the previous drawing', async () => {
  const db = await openStorage();
  await saveDrawing(db, content, 0);
  const put = IDBObjectStore.prototype.put;
  try {
    IDBObjectStore.prototype.put = () => { throw new DOMException('Full', 'QuotaExceededError'); };
    await assert.rejects(saveDrawing(db, 'unsaved', 1), { name: 'QuotaExceededError' });
  } finally {
    IDBObjectStore.prototype.put = put;
  }
  assert.deepEqual(await loadDrawing(db), { content, revision: 1 });
  db.close();
});

test('concurrent writes with the same revision cannot both win', async () => {
  const db = await openStorage();
  const results = await Promise.allSettled([
    saveDrawing(db, 'first', 0),
    saveDrawing(db, 'second', 0)
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.name, 'VersionError');
  assert.deepEqual(await loadDrawing(db), { content: 'first', revision: 1 });
  db.close();
});

test('reports unavailable storage instead of claiming success', async () => {
  globalThis.indexedDB = { open() { throw new DOMException('Denied', 'SecurityError'); } };
  await assert.rejects(openStorage(), { name: 'SecurityError' });
});
