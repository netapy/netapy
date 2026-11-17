import React from 'react';
import { createRoot } from 'react-dom/client';
import { Excalidraw, WelcomeScreen, serializeAsJSON } from '@excalidraw/excalidraw';
import { openStorage, loadDrawing, saveDrawing } from './storage.js';

const warning = document.getElementById('storage-error');
let db;
let revision = 0;
let initialData = { appState: { viewBackgroundColor: '#ffffff' } };
let latestContent;
let savedContent;

function showStorageError(error) {
  warning.textContent = error.name === 'VersionError'
    ? error.message
    : 'Local autosave is unavailable. Save your drawing from the menu before leaving.';
  warning.hidden = false;
  console.error('Drawing autosave:', error);
}

try {
  db = await openStorage();
  const saved = await loadDrawing(db);
  if (saved) {
    const data = JSON.parse(saved.content);
    if (data.type !== 'excalidraw' || !Array.isArray(data.elements) || !Array.isArray(data.libraryItems)) {
      throw new Error('Invalid saved drawing.');
    }
    initialData = data;
    revision = saved.revision;
    latestContent = savedContent = saved.content;
  }
} catch (error) {
  db?.close();
  db = null;
  showStorageError(error);
}

let scene;
let libraryItems = initialData.libraryItems ?? [];
let timer;
let writes = Promise.resolve();

function flush() {
  clearTimeout(timer);
  timer = null;
  if (!scene) return;
  const { elements, appState, files } = scene;
  const data = JSON.parse(serializeAsJSON(elements, appState, files, 'local'));
  // Keep the view, not transient selections, dialogs, pointers or file handles.
  Object.assign(data.appState, {
    theme: appState.theme,
    name: appState.name,
    zoom: appState.zoom,
    scrollX: appState.scrollX,
    scrollY: appState.scrollY
  });
  data.libraryItems = libraryItems;
  const content = JSON.stringify(data);
  if (content === latestContent) return;
  latestContent = content;
  if (!db) return;
  writes = writes.then(async () => {
    if (!db) return;
    revision = await saveDrawing(db, content, revision);
    savedContent = content;
  }).catch(error => {
    db?.close();
    db = null;
    showStorageError(error);
  });
}

function scheduleSave() {
  // ponytail: bounded 500 ms batching, including during long drawing gestures.
  timer ??= setTimeout(flush, 500);
}

createRoot(document.getElementById('app')).render(React.createElement(Excalidraw, {
  initialData,
  autoFocus: true,
  onChange: (elements, appState, files) => {
    if (appState.isLoading) return;
    scene = { elements, appState, files };
    scheduleSave();
  },
  onLibraryChange: items => {
    libraryItems = items;
    scheduleSave();
  }
}, React.createElement(WelcomeScreen, null, React.createElement(React.Fragment))));

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
});
window.addEventListener('pagehide', flush);
window.addEventListener('beforeunload', event => {
  flush();
  if (latestContent !== savedContent) {
    event.preventDefault();
    event.returnValue = '';
  }
});
