const title = (s) =>
  s === "lastWords"
    ? "Last Words"
    : s === "stable"
      ? "Stabilized"
      : s[0].toUpperCase() + s.slice(1);
export function combatFeedback(before, actors, R) {
  const next = new Map(),
    events = [];
  for (const a of actors) {
    const id = a.heroId ?? a.id,
      conditions = R.conditionSummary(a.conditions ?? []),
      state = {
        hp: a.survival?.hp ?? a.hp,
        status: a.survival?.status ?? (a.hp > 0 ? "active" : "dead"),
        conditions: Object.fromEntries(
          Object.entries(conditions)
            .filter(([, c]) => c.active || c.rating > 0)
            .map(([k, c]) => [k, c.rating || 1]),
        ),
      };
    next.set(id, state);
    const old = before?.get(id);
    if (!old) continue;
    const delta = state.hp - old.hp;
    if (delta)
      events.push({
        id: a.id,
        kind: delta > 0 ? "healing" : "damage",
        text: delta > 0 ? `+${delta}` : `−${-delta}`,
        amount: Math.abs(delta),
      });
    for (const key of new Set([
      ...Object.keys(old.conditions),
      ...Object.keys(state.conditions),
    ])) {
      const was = old.conditions[key] ?? 0,
        now = state.conditions[key] ?? 0;
      if (was === now) continue;
      events.push({
        id: a.id,
        kind: now > was ? "status" : "recovery",
        text: now ? `${title(key)} ${now}` : `${title(key)} cleared`,
      });
    }
    if (state.status !== old.status)
      events.push({
        id: a.id,
        kind:
          state.status === "active" || state.status === "stable"
            ? "recovery"
            : "status",
        text: title(state.status),
      });
  }
  return { next, events };
}
