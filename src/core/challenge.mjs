export const CHALLENGES = Object.freeze({
  story: { name: "Story", factor: 0.75, count: 4, copies: 1, detail: "Smaller enemy groups for a gentler expedition." },
  standard: { name: "Adventurer", factor: 1, count: 5, copies: 2, detail: "The original encounter balance." },
  veteran: { name: "Veteran", factor: 1.4, count: 6, copies: 3, detail: "Larger, stronger groups that demand careful tactics." },
  perilous: { name: "Perilous", factor: 1.85, count: 7, copies: 4, detail: "Heavy opposition for experienced companies." },
});
export function challenge(id = "standard") {
  const value = CHALLENGES[id];
  if (!value) throw new Error("Unknown encounter challenge.");
  return value;
}
