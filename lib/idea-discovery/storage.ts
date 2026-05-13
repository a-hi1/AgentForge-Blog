import { DiscoverySession, DirectionReport } from './types';

const STORAGE_KEY = 'agentforge_idea_discovery_history';

export interface DiscoveryRecord {
  id: string;
  originalIdea: string;
  createdAt: number;
  updatedAt: number;
  session: DiscoverySession;
  report?: DirectionReport;
  favorite?: boolean;
}

export function getDiscoveryHistory(): DiscoveryRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const records = JSON.parse(data);
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

export function saveDiscoveryToHistory(
  session: DiscoverySession,
  report?: DirectionReport
): DiscoveryRecord {
  const existingRecords = getDiscoveryHistory();
  const existingIndex = existingRecords.findIndex(r => r.id === session.id);

  const record: DiscoveryRecord = {
    id: session.id,
    originalIdea: session.collectedFacts.originalIdea,
    createdAt: existingIndex >= 0 ? existingRecords[existingIndex].createdAt : Date.now(),
    updatedAt: Date.now(),
    session,
    report,
    favorite: existingIndex >= 0 ? existingRecords[existingIndex].favorite : false
  };

  let updatedRecords;
  if (existingIndex >= 0) {
    updatedRecords = [...existingRecords];
    updatedRecords[existingIndex] = record;
  } else {
    updatedRecords = [record, ...existingRecords];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecords));
  } catch {
    console.warn('Failed to save discovery history to localStorage');
  }

  return record;
}

export function deleteDiscoveryRecord(id: string): void {
  const records = getDiscoveryHistory();
  const filtered = records.filter(r => r.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    console.warn('Failed to delete discovery record');
  }
}

export function toggleDiscoveryFavorite(id: string): void {
  const records = getDiscoveryHistory();
  const updated = records.map(r =>
    r.id === id ? { ...r, favorite: !r.favorite } : r
  );
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    console.warn('Failed to toggle favorite');
  }
}

export function getDiscoveryRecord(id: string): DiscoveryRecord | undefined {
  return getDiscoveryHistory().find(r => r.id === id);
}
