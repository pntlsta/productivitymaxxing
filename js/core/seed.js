// Records committed to the site repo (data/workbench-data.json) load automatically on startup.
// Anything already present (from GitHub issues or an earlier load) is skipped, so this is safe
// to run on every page load and on every device.
import { importData } from './backup.js';
import { lsGet, lsSet } from './util.js';

export const SEED_PATH = 'data/workbench-data.json';

export async function applySeed() {
  let data;
  try {
    const res = await fetch(SEED_PATH, { cache: 'no-store' });
    if (!res.ok) return null;
    data = await res.json();
  } catch { return null; }
  // Only once per version of the file per browser, so records you delete later don't come back.
  const key = `wb.seed.${data.exportedAt || 'v1'}`;
  if (lsGet(key, false)) return null;
  const result = importData(data);
  lsSet(key, true);
  return result;
}
