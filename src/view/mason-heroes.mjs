import { activeItemEffects } from "../core/treasure.mjs";
import * as T from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { normalizeAppearance } from "../core/identity.mjs";
import {
  MASON_CLASS_HATS,
  MASON_OPTIONS,
  masonWeaponVisual,
  masonBody,
} from "../core/mason-appearance.mjs";
export const MASON_URL = "/assets/licensed/dungeon-mason/hero.glb";
export function masonAppearance(asset, hero, assets) {
  const draft = hero.draft ?? hero,
    a = normalizeAppearance(draft.appearance, draft.ancestryId, hero.name),
    choice = a.mason;
  const model = clone(asset.scene),
    owned = [];
  const items = hero.preview?.inventory?.items ?? [];
  const held = (id) =>
    items.find((i) => i.carried && i.held && i.catalogId === id);
  const melee = held("item-ordinary-melee-weapon"),
    ranged = held("item-ordinary-ranged-weapon");
  const shield = held("item-ordinary-shield");
  const helm = items.some((i) => i.carried && i.worn && i.slot === "head");
  const backpack = items.some(
    (i) => i.carried && i.worn && i.catalogId === "item-travel-pack",
  );
  const armor = items.find(
    (i) =>
      i.carried &&
      i.worn &&
      /item-ordinary-(light|medium|heavy)-armor/.test(i.catalogId),
  );
  const tier =
    armor?.catalogId.match(/(light|medium|heavy)-armor/)[1] ?? "cloth";
  const body = masonBody(draft.classId);
  const hat = helm
    ? "Hat14"
    : choice.headpiece === "class"
      ? (MASON_CLASS_HATS[draft.classId] ?? "Hat03")
      : choice.headpiece;
  const visual = masonWeaponVisual(melee ?? ranged, choice);
  const weapon = melee ? visual.model : null;
  const bow = ranged ? visual.model : null;
  const selected = new Set([
    body,
    choice.head === "auto"
      ? a.sex === "female"
        ? "Head02_Female"
        : "Head01_Male"
      : choice.head,
    choice.eyes,
    choice.mouth,
    choice.brows,
    choice.facialHair,
    choice.ears,
    choice.horns,
    choice.crown,
    choice.eyewear,
    choice.mask,
    choice.ornament,
    choice.cloak,
    hat,
    backpack ? choice.backpack : null,
    shield ? choice.shield : null,
    bow,
    ranged ? visual.arrow : null,
    weapon,
  ]);
  if (hat === "none") selected.add(choice.hair);
  const partNames = new Set(Object.values(MASON_OPTIONS).flat());
  model.traverse((o) => {
    if (partNames.has(o.name)) o.visible = selected.has(o.name);
    if (!o.isMesh) return;
    let part = o;
    while (part && !partNames.has(part.name)) part = part.parent;
    o.visible = !!part && selected.has(part.name);
    const paint = (source) => {
      const m = source.clone();
      const channel = Number(source.name.match(/^MasonChannel(\d+)/)?.[1]);
      const hairPart = /^(Hair|Eyebrow|AC10_|AC11_)/.test(part?.name ?? "");
      const tint =
        channel === 9
          ? a.skin
          : hairPart
            ? a.hairColor
            : a.outfitColors[channel - 1];
      if (tint) {
        const color = new T.Color(tint);
        m.onBeforeCompile = (shader) => {
          shader.uniforms.masonTint = { value: color };
          shader.fragmentShader =
            "uniform vec3 masonTint;\n" + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <map_fragment>",
            "#include <map_fragment>\ndiffuseColor.rgb = masonTint * max(0.25, max(max(diffuseColor.r, diffuseColor.g), diffuseColor.b));",
          );
        };
        m.customProgramCacheKey = () => `mason-tint-${channel}`;
      }
      owned.push(m);
      return m;
    };
    o.material = Array.isArray(o.material)
      ? o.material.map(paint)
      : paint(o.material);
  });
  // Stable semantic anchors keep combat effects independent of model filenames.
  for (const [partName, alias] of [
    [weapon, "Readied melee weapon"],
    [bow, "Readied bow"],
    [shield ? choice.shield : null, "Readied shield"],
  ]) {
    const part = partName && model.getObjectByName(partName);
    if (!part) continue;
    const mount = new T.Group();
    mount.name = alias;
    part.parent.add(mount);
    mount.add(part);
  }
  // Geometry and animation retain authored dimensions; no ancestry morphs in this version.
  model.scale.setScalar(1.15);
  model.userData.height = 1.8;
  model.userData.avatar = "DungeonMason";
  model.userData.weaponVisual = visual;
  model.userData.appearance = { ...a, ancestry: draft.ancestryId };
  model.userData.equipment = {
    armor: tier,
    weapon: ranged ? "bow" : melee ? "melee" : "unarmed",
    shield: !!shield,
    backpack,
  };
  const right = model.getObjectByName("weapon_r"),
    left = model.getObjectByName("weapon_l");

  if (hero.torch?.held) {
    const hand = melee ? left : right;
    if (hand) {
      const torch = new T.Group();
      torch.scale.setScalar(50);
      const unlit = clone(assets.get("torch").scene),
        lit = clone(assets.get("torchLit").scene);
      torch.name = "Readied torch";
      unlit.name = "Authored unlit torch";
      lit.name = "Authored lit torch";
      torch.add(unlit, lit);
      torch.traverse((o) => {
        if (o.isMesh) {
          const copy = (m) => {
            const material = m.clone();
            owned.push(material);
            return material;
          };
          o.material = Array.isArray(o.material)
            ? o.material.map(copy)
            : copy(o.material);
        }
      });
      hand.add(torch);
      // KayKit's flame points along +Y. Dungeon Mason's weapon bones use
      // different axes: calibrate the grip in the actual ready pose, then
      // restore the model before its gameplay mixer takes ownership.
      const idleName = melee ? "SingleIdle" : "UnarmedIdle";
      const idle = asset.animations.find((clip) => clip.name === idleName);
      if (idle) {
        const pose = new T.AnimationMixer(model);
        pose.clipAction(idle).play();
        pose.update(0);
        model.updateMatrixWorld(true);
        torch.quaternion.copy(
          hand.getWorldQuaternion(new T.Quaternion()).invert(),
        );
        pose.stopAllAction();
        pose.uncacheRoot(model);
      }
      model.userData.setTorchLit = (v) => {
        lit.visible = !!v;
        unlit.visible = !v;
        model.userData.torchLit = !!v;
      };
      model.userData.setTorchLit(hero.torch.lit);
    }
  }
  const enchanted = items.filter(
    (i) => i.carried && (i.held || i.worn) && i.effects?.length,
  );
  model.userData.magicItems = enchanted.map((i) => i.instanceId);
  for (const item of enchanted) {
    const active = activeItemEffects(hero, item).length > 0,
      tint = item.effects[0]?.color ?? 0xb591f1;
    const rune = new T.Group();
    rune.name = `Enchantment runes ${item.instanceId}`;
    const geometry = new T.OctahedronGeometry(item.relic ? 0.07 : 0.045),
      material = new T.MeshStandardMaterial({
        color: tint,
        emissive: tint,
        emissiveIntensity: active ? 2.2 : 0.45,
        roughness: 0.25,
        metalness: 0.65,
      });
    owned.push(geometry, material);
    for (let n = 0; n < (item.relic ? 3 : 2); n++) {
      const mark = new T.Mesh(geometry, material);
      mark.position.set((n - 0.5) * 0.11, 0.07 * (n % 2), 0);
      rune.add(mark);
    }
    const bone = item.held
      ? item.catalogId.includes("shield")
        ? left
        : right
      : model.getObjectByName(item.slot === "head" ? "head" : "spine_03");
    rune.scale.setScalar(100);
    rune.position.set(0, 5, 15);
    (bone ?? model).add(rune);
  }
  let concealed = false;
  model.userData.setConcealed = (value) => {
    model.userData.concealed = !!value;
    if (value === concealed) return;
    concealed = value;
    for (const m of owned.filter((resource) => resource.isMaterial)) {
      m.transparent = !!value;
      m.opacity = value ? 0.38 : 1;
      m.needsUpdate = true;
    }
  };
  model.userData.setConcealed(!!hero.concealed);
  model.userData.dispose = () => owned.forEach((m) => m.dispose());
  const profile = ranged
    ? "Bow"
    : melee?.hands === 2
      ? "TwoHand"
      : melee && !shield
        ? "Single"
        : !melee
          ? "Unarmed"
          : "";
  const aliases = {
    Idle: `${profile}Idle`,
    Walking_A: `${profile}Walk`,
    "1H_Melee_Attack_Slice_Diagonal": `${profile}Attack`,
  };
  const clips = asset.animations
    .filter(
      (c) => !c.name.match(/^(TwoHand|Single|Unarmed|Bow)(Idle|Walk|Attack)$/),
    )
    .map((clip) => {
      const replacement = asset.animations.find(
        (c) => c.name === aliases[clip.name],
      );
      if (!replacement) return clip;
      const c = replacement.clone();
      c.name = clip.name;
      return c;
    });
  return { model, clips };
}
