import {
  contactExclusions,
  matchesContactExclusion,
} from "./contact-policy.js";
type RecordValue = Record<string, unknown>;
export type RecordStore = {
  get: (key: string) => Promise<unknown>;
  keys: (prefix: string, limit: number, after?: string) => Promise<string[]>;
};
const object = (x: unknown): RecordValue =>
  x !== null && typeof x === "object" && !Array.isArray(x)
    ? (x as RecordValue)
    : {};
async function feedback(
  store: RecordStore,
  id: string,
  includeHistory = false,
) {
  const legacy = object(await store.get("feedback." + id));
  const byLead = new Map(
    Object.entries(legacy).map(([key, value]) => [key, object(value)]),
  );
  for (const kind of includeHistory
    ? ["crm-history.", "crm-mark."]
    : ["crm-mark."]) {
    let cursor: string | undefined;
    do {
      const prefix = kind + id + ".";
      const keys = await store.keys(prefix, 100, cursor);
      const records = await Promise.all(keys.map((key) => store.get(key)));
      records.forEach((row, i) => {
        const mark = object(row);
        if (
          mark.listId !== id ||
          typeof mark.leadId !== "string" ||
          keys[i] !== prefix + mark.leadId
        )
          throw Error("Cannot read saved marks");
        const archived = object(mark.mark);
        byLead.set(
          mark.leadId,
          kind === "crm-history."
            ? { status: archived.s, at: archived.at }
            : mark,
        );
      });
      cursor = keys.length === 100 ? keys.at(-1) : undefined;
    } while (cursor);
  }
  return byLead;
}
export async function contactPolicy(
  stores: RecordStore[],
  markStores: RecordStore[],
  id?: string,
  includeHistory = false,
) {
  const [exclusions, feedbackMaps] = await Promise.all([
    Promise.all(stores.map(contactExclusions)),
    id
      ? Promise.all(
          markStores.map((store) => feedback(store, id, includeHistory)),
        )
      : [],
  ]);
  const suppressed = new Set(exclusions.flatMap((set) => [...set]));
  const marks = new Map<string, RecordValue>();
  for (const map of feedbackMaps)
    for (const [key, mark] of map) {
      const old = marks.get(key);
      if (!old || String(mark.at || "") > String(old.at || ""))
        marks.set(key, mark);
    }
  return (row: RecordValue) => {
    if (matchesContactExclusion(row, suppressed)) return null;
    const mark =
      typeof row.leadId === "string" ? marks.get(row.leadId) : undefined;
    return mark
      ? { ...row, status: mark.status, note: mark.note, at: mark.at }
      : row;
  };
}
export async function listPolicy(
  store: RecordStore,
  id: string,
  other?: RecordStore,
) {
  return contactPolicy(other ? [store, other] : [store], [store], id);
}
