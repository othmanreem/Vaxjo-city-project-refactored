const cache = new Map();
export async function loadJson(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(path).then(async response => {
      if (!response.ok) throw new Error(`Cannot load ${path} (HTTP ${response.status})`);
      return response.json();
    }).catch(error => { cache.delete(path); throw error; }));
  }
  return cache.get(path);
}
