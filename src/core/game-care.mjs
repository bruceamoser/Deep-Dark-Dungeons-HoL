export const gameCareMethods = {
  completeWound(patient, wound, method) {
    wound.treatment = {
      ...(wound.treatment ?? {}),
      completed: true,
      progress: wound.record.recoveryValue ?? 1,
      gameMethod: method,
      attempts: wound.treatment?.attempts ?? [],
    };
    patient.conditions = patient.conditions.filter(
      (c) => c.woundId !== wound.id,
    );
    this.note(
      `${patient.name}: ${wound.record.injury} treated with ${method}. Scar and wound count remain.`,
    );
  },
  careQuote(index, woundId, method = "camp") {
    const patient = this.party[index],
      w = patient?.wounds.find((w) => w.id === woundId);
    const exceptional = !w?.record.recoveryValue;
    const cost = exceptional
      ? 100
      : Math.max(15, (w?.record.recoveryValue ?? 3) * 5);
    let reason = "";
    if (!w || w.treatment?.completed) reason = "Choose an untreated injury.";
    else if (
      w.treatment?.attempts?.some((a) => a.dayKey === `day-${this.clock().day}`)
    )
      reason = "This wound has already had its treatment attempt today.";
    else if (w.campCare && w.campCare.minutes < w.campCare.required)
      reason = "Restoration care is in progress. Continue it in camp.";
    else if (
      !["town", "exploration"].includes(this.mode) ||
      this.busy ||
      this.pendingDefense ||
      this.pendingProvocation ||
      this.woundNotices?.length
    )
      reason = "Finish the current event before treating wounds.";
    else if (["dead", "lastWords"].includes(patient.survival.status))
      reason = "This hero cannot receive wound treatment.";
    else if (method === "town" && this.mode !== "town")
      reason = "Visit the infirmary in Greyhaven.";
    else if (method === "town" && this.campaign.bank < cost)
      reason = `Requires ${cost} vault coins.`;
    else if (method !== "town" && this.sleepReason())
      reason = this.sleepReason();
    const itemId = exceptional
      ? "item-restoration-draught"
      : "item-field-dressing";
    const healer = this.party.find(
      (h) => this.canAct(h) && this.supplyItem(h, itemId),
    );
    if (!reason && method !== "town" && !healer)
      reason = exceptional
        ? "Requires a restoration draught."
        : "Requires a field dressing carried by a capable companion.";
    return {
      wound: w,
      patient,
      healer,
      itemId,
      cost,
      minutes: Math.ceil(
        (exceptional ? 240 : 60) *
          (1 -
            Math.max(
              0,
              ...this.party
                .filter((h) => this.canAct(h))
                .flatMap((h) => this.traits(h).map((t) => t.careSpeed ?? 0)),
            )),
      ),
      exceptional,
      reason,
    };
  },
  treatGameWound(index, woundId, method = "camp") {
    const q = this.careQuote(index, woundId, method);
    if (q.reason) throw new Error(q.reason);
    if (method === "town") this.campaign.bank -= q.cost;
    else {
      const item = this.supplyItem(q.healer, q.itemId);
      q.healer.supplies[item.instanceId] = 0;
      this.supplyNotice(
        q.healer,
        item,
        `${item.definition.name} was used for wound treatment.`,
      );
    }
    this.completeWound(
      q.patient,
      q.wound,
      method === "town"
        ? "Greyhaven infirmary"
        : q.exceptional
          ? "restoration draught"
          : "field dressing",
    );
    if (q.patient.survival.status === "dying")
      q.patient.survival = this.R.stabilize(q.patient.survival);
    this.advanceTime(q.minutes * 60, { provisions: true });
    this.emit("change");
  },
};
