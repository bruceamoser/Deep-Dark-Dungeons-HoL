import { deserialize } from "./save.mjs";
const slotKey = (id) => {
  if (!/^run-[a-f0-9-]{36}$/.test(id)) throw new Error("Invalid run slot.");
  return id;
};
const title = (name) => {
  const value = String(name ?? "")
    .trim()
    .slice(0, 64);
  if (!value) throw new Error("Give this run a name.");
  return value;
};
export class SaveLibrary {
  constructor(storage) {
    this.storage = storage;
    this.active = null;
    this.queue = Promise.resolve();
  }
  operation(fn) {
    const pending = this.queue.then(fn);
    this.queue = pending.catch(() => {});
    return pending;
  }
  async initialize() {
    const index = await this.storage.get("index");
    this.active = index ? JSON.parse(index).active : null;
    const slots = await this.list();
    this.firstLaunch = !index && !slots.length;
    if (this.active && !slots.some((s) => s.id === this.active && !s.invalid))
      this.active = null;
    if (!index && !slots.length) {
      const legacy = await this.storage.get("legacy");
      if (legacy) await this.create("Original expedition", legacy);
    }
    return this.active;
  }
  async list() {
    await this.queue;
    const keys = await this.storage.keys();
    const entries = await Promise.all(
      keys
        .filter((k) => /^run-[a-f0-9-]{36}$/.test(k))
        .map(async (id) => {
          try {
            const record = JSON.parse(await this.storage.get(id));
            const c = deserialize(record.text);
            return {
              id,
              name: record.name,
              updatedAt: record.updatedAt,
              mode: c.mode,
              depth: c.depth,
              bank: c.bank,
              heroes: c.party.map((h) => ({
                name: h.name,
                level: h.draft.progression?.level ?? 1,
                hp: h.survival.hp,
                status: h.survival.status,
              })),
              round: c.encounter?.round,
              returnDepth: c.returnPassage?.depth,
            };
          } catch {
            return { id, name: "Unreadable save", invalid: true };
          }
        }),
    );
    return entries.sort((a, b) =>
      String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")),
    );
  }
  async read(id) {
    await this.queue;
    const raw = await this.storage.get(slotKey(id));
    if (!raw) throw new Error("This save slot no longer exists.");
    const record = JSON.parse(raw);
    deserialize(record.text);
    return record.text;
  }
  create(name, text, activate = true) {
    name = title(name);
    deserialize(text);
    const id = `run-${crypto.randomUUID()}`;
    return this.operation(async () => {
      await this.storage.set(
        id,
        JSON.stringify({ id, name, updatedAt: new Date().toISOString(), text }),
      );
      if (activate) {
        await this.storage.set("index", JSON.stringify({ active: id }));
        this.active = id;
      }
      return id;
    });
  }
  write(id, text) {
    slotKey(id);
    deserialize(text);
    return this.operation(async () => {
      const raw = await this.storage.get(id);
      if (!raw) throw new Error("This save slot no longer exists.");
      const record = JSON.parse(raw);
      await this.storage.set(
        id,
        JSON.stringify({
          ...record,
          updatedAt: new Date().toISOString(),
          text,
        }),
      );
    });
  }
  activate(id) {
    if (id !== null) slotKey(id);
    return this.operation(async () => {
      if (id && !(await this.storage.get(id)))
        throw new Error("This save slot no longer exists.");
      await this.storage.set("index", JSON.stringify({ active: id }));
      this.active = id;
    });
  }
  rename(id, name) {
    slotKey(id);
    name = title(name);
    return this.operation(async () => {
      const record = JSON.parse(await this.storage.get(id));
      if (!record) throw new Error("This save slot no longer exists.");
      await this.storage.set(id, JSON.stringify({ ...record, name }));
    });
  }
  remove(id, { allowActive = false } = {}) {
    slotKey(id);
    return this.operation(async () => {
      const wasActive = id === this.active;
      if (wasActive && !allowActive)
        throw new Error("Exit this run before deleting its save.");
      if (wasActive)
        await this.storage.set("index", JSON.stringify({ active: null }));
      try {
        await this.storage.remove(id);
      } catch (error) {
        if (wasActive)
          await this.storage.set("index", JSON.stringify({ active: id }));
        throw error;
      }
      if (wasActive) this.active = null;
    });
  }
}
export function browserSaveStorage(storage) {
  const prefix = "ddd.runs.v1.";
  return {
    get: async (key) =>
      storage.getItem(key === "legacy" ? "ddd.campaign.v1" : prefix + key),
    set: async (key, value) => storage.setItem(prefix + key, value),
    remove: async (key) => storage.removeItem(prefix + key),
    keys: async () =>
      Array.from({ length: storage.length }, (_, i) => storage.key(i))
        .filter((k) => k.startsWith(prefix))
        .map((k) => k.slice(prefix.length)),
  };
}
