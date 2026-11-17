export function openStorage() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('netapy-draw', 1);
    let blocked = false;
    request.onupgradeneeded = () => request.result.createObjectStore('drawing');
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Close other drawing tabs and reload.'));
    };
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) return db.close();
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}

export function loadDrawing(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('drawing', 'readonly');
    const request = transaction.objectStore('drawing').get('current');
    transaction.oncomplete = () => resolve(request.result);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function saveDrawing(db, content, revision) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('drawing', 'readwrite');
    const store = transaction.objectStore('drawing');
    const request = store.get('current');
    let failure;
    request.onsuccess = () => {
      // ponytail: one current drawing; refuse stale tabs instead of merging scenes.
      if ((request.result?.revision ?? 0) !== revision) {
        failure = new DOMException('This drawing was saved in another tab. Export yours before reloading.', 'VersionError');
        transaction.abort();
        return;
      }
      try {
        store.put({ content, revision: revision + 1 }, 'current');
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => resolve(revision + 1);
    transaction.onabort = () => reject(failure ?? transaction.error);
  });
}
