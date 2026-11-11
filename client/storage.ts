import { parseProject } from '../shared/project';
import { LIMITS, type Project } from '../shared/schema';
const KEY = 'scopeledger.project.v1';
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function saveProject(project: Project, storage: Pick<Store, 'setItem'> = localStorage): void {
  try { storage.setItem(KEY, JSON.stringify(project)); }
  catch { throw new Error('Could not save on this device. Storage may be full or disabled. Your current work is still here; export a project record instead.'); }
}
export async function restoreProject(storage: Pick<Store, 'getItem'> = localStorage): Promise<Project | null> {
  const raw = storage.getItem(KEY);
  if (!raw) return null;
  if (raw.length > LIMITS.fileBytes) throw new Error('Saved record is too large.');
  return parseProject(JSON.parse(raw));
}
export function clearProject(storage: Pick<Store, 'removeItem'> = localStorage): void { storage.removeItem(KEY); }
