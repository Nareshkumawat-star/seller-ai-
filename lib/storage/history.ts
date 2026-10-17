import type { ListingResult } from "@/lib/ai/output-schema";
import type { ProductInput } from "@/lib/validation/product-input";

export const HISTORY_KEY = "seller-ai:listings:v1";
export const HISTORY_VERSION = 1;
export const HISTORY_LIMIT = 40;

export type SavedListing = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  input: ProductInput;
  listing: ListingResult;
};

type Envelope = { version: number; items: SavedListing[] };

function isSavedListing(value: unknown): value is SavedListing {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SavedListing>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string" &&
    Boolean(item.input) &&
    typeof item.input === "object" &&
    Boolean(item.listing) &&
    typeof item.listing === "object"
  );
}

export function readHistory(storage: Storage | undefined = safeStorage()): SavedListing[] {
  if (!storage) return [];
  const raw = storage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return [];
    const envelope = parsed as Partial<Envelope>;
    if (envelope.version !== HISTORY_VERSION || !Array.isArray(envelope.items)) return [];
    return envelope.items.filter(isSavedListing);
  } catch {
    return [];
  }
}

function writeHistory(items: SavedListing[], storage: Storage | undefined = safeStorage()): boolean {
  if (!storage) return false;
  try {
    const envelope: Envelope = { version: HISTORY_VERSION, items: items.slice(0, HISTORY_LIMIT) };
    storage.setItem(HISTORY_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `l_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function saveListing(
  entry: { name: string; input: ProductInput; listing: ListingResult; id?: string },
  storage: Storage | undefined = safeStorage(),
): SavedListing | null {
  const now = new Date().toISOString();
  const items = readHistory(storage);
  const existing = entry.id ? items.find((item) => item.id === entry.id) : undefined;
  const saved: SavedListing = {
    id: existing?.id ?? entry.id ?? newId(),
    name: entry.name.trim() || entry.input.name || "Untitled listing",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    input: entry.input,
    listing: entry.listing,
  };
  const next = [saved, ...items.filter((item) => item.id !== saved.id)];
  return writeHistory(next, storage) ? saved : null;
}

export function renameListing(
  id: string,
  name: string,
  storage: Storage | undefined = safeStorage(),
): SavedListing[] {
  const items = readHistory(storage).map((item) =>
    item.id === id ? { ...item, name: name.trim() || item.name, updatedAt: new Date().toISOString() } : item,
  );
  writeHistory(items, storage);
  return items;
}

export function deleteListing(id: string, storage: Storage | undefined = safeStorage()): SavedListing[] {
  const items = readHistory(storage).filter((item) => item.id !== id);
  writeHistory(items, storage);
  return items;
}

export function clearHistory(storage: Storage | undefined = safeStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(HISTORY_KEY);
  } catch {
    // storage unavailable — nothing to clear
  }
}

function safeStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
