// Complete authored KayKit silhouettes; appearance never grants class abilities.
export const HERO_AVATARS = [
  ["auto", "Class suggestion"],
  ["Knight", "Knight", "adventurersv2/Knight"],
  ["Rogue", "Hooded rogue", "adventurersv2/Rogue_Hooded"],
  ["RogueUnhooded", "Rogue", "adventurersv2/Rogue"],
  ["Mage", "Mage", "adventurersv2/Mage"],
  ["Barbarian", "Barbarian", "adventurersv2/Barbarian"],
  ["Ranger", "Ranger", "adventurersv2/Ranger"],
  ["Druid", "Druid", "adventurersv2/Druid"],
  ["Engineer", "Engineer", "adventurersv2/Engineer"],
  ["Paladin", "Paladin", "series4/Paladin"],
  ["PaladinHelmed", "Helmed paladin", "series4/Paladin_with_Helmet"],
  ["Tiefling", "Tiefling", "series5/Tiefling"],
  ["Witch", "Witch", "series5/Witch"],
  ["Vampire", "Vampire", "series5/Vampire"],
  ["Cleric", "Cleric", "series6/Cleric"],
  ["Lorekeeper", "Lorekeeper", "series6/Lorekeeper"],
].map(([id, label, file]) => ({
  id,
  label,
  url: file ? `/assets/characters/${file}.glb` : null,
}));
export const HERO_MODELS = Object.fromEntries(
  HERO_AVATARS.filter((a) => a.url).map((a) => [a.id, a.url]),
);
export const avatarFor = (hero) => {
  const id = hero.draft?.appearance?.avatar ?? hero.appearance?.avatar;
  return Object.hasOwn(HERO_MODELS, id) ? id : (hero.model ?? "Knight");
};
