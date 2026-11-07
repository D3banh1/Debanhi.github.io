import { z } from 'zod';
import { dataSchema } from './validation.ts';
import { starterData, eventNames, type Data, type Activity } from './model.ts';

export const STORAGE_KEY = 'fieldnotes.workspace.v1';
export type WorkspaceSnapshot = { schemaVersion: 1; version: number; data: Data; events: Activity[] };
type StorageLike = { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void };
const activitySchema = z.object({ id: z.string().max(100), name: z.enum(eventNames), createdAt: z.string().datetime(), entityId: z.string().max(100).nullable() });
const snapshotSchema = z.object({ schemaVersion: z.literal(1), version: z.number().int().nonnegative(), data: dataSchema, events: z.array(activitySchema).max(5000) });

export function freshSnapshot(): WorkspaceSnapshot {
  return { schemaVersion: 1, version: 0, data: starterData(), events: [] };
}

export function readSnapshot(storage: StorageLike): WorkspaceSnapshot | null {
  const text = storage.getItem(STORAGE_KEY);
  if (!text) return null;
  try { return snapshotSchema.parse(JSON.parse(text)); }
  catch { throw new Error('Your saved workspace could not be read. Download a recovery copy before resetting it.'); }
}

export function saveSnapshot(storage: StorageLike, previous: WorkspaceSnapshot, data: Data, events: Activity[]): WorkspaceSnapshot {
  const latest = readSnapshot(storage);
  if (latest && latest.version !== previous.version) throw new Error('Your workspace changed in another tab. Reload before saving.');
  const next = snapshotSchema.parse({ schemaVersion: 1, version: previous.version + 1, data, events: events.slice(0, 5000) });
  try { storage.setItem(STORAGE_KEY, JSON.stringify(next)); }
  catch { throw new Error('Your browser could not save this change. Export a backup, then free browser storage or allow storage for this site.'); }
  return next;
}

export function parseBackup(text: string): { data: Data; events: Activity[] } {
  if (text.length > 6000000) throw new Error('Choose a backup smaller than 6 MB.');
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('Choose a valid Fieldnotes JSON backup.'); }
  const snapshot = snapshotSchema.safeParse(raw);
  if (snapshot.success) return { data: snapshot.data.data, events: snapshot.data.events };
  // Also support the plain workspace JSON exported by the initial prototype.
  const data = dataSchema.safeParse(raw);
  if (data.success) return { data: data.data, events: [] };
  throw new Error('This file is not a valid Fieldnotes backup. Your current workspace has not changed.');
}
