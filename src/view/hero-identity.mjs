import * as T from "three";
import { ANCESTRY_LOOKS, normalizeAppearance, signatureFor } from "../core/identity.mjs";
import { dressOutfit } from "./outfit.mjs";
// Original modular geometry fitted to KayKit's CC0 Adventurers rig.
export function dressIdentity(model, hero, owned, opts = {}) {
  const ancestry =
    hero.draft?.ancestryId ?? hero.ancestryId ?? "ancestry-human";
  const look = ANCESTRY_LOOKS[ancestry] ?? ANCESTRY_LOOKS["ancestry-human"];
  const sig = signatureFor(ancestry);
  const a = normalizeAppearance(
    hero.draft?.appearance ?? hero.appearance,
    ancestry,
    hero.name ?? "",
  );
  const material = (color, extra = {}) => {
    const m = new T.MeshStandardMaterial({ color, roughness: 0.74, ...extra });
    owned.push(m);
    return m;
  };
  const skin = material(a.skin, {
      metalness: look.ears === "construct" ? 0.4 : 0,
    }),
    hair = material(a.hairColor),
    iris = material(a.eyeColor, {
      roughness: 0.3,
      emissive: look.ears === "construct" ? a.eyeColor : "#000000",
      emissiveIntensity: look.ears === "construct" ? 1.2 : 0,
    }),
    dark = material("#171b20"),
    white = material("#ddd7c7"),
    lip = material(new T.Color(a.skin).multiplyScalar(0.64)),
    accent = material(a.accentColor, { metalness: 0.55, roughness: 0.4 });
  // The Adventurers 2.0 and Series packs model a complete head and face. Drawing the
  // generated sphere face over it produced the goggle look and hid the pack's own
  // sculpt, so the overlay is opt-in: only a bare rig that needs a face asks for it.
  const drawFace = opts.proceduralFace === true;
  const female = a.sex === "female";
  const soft = a.face === "soft";
  let head;
  model.traverse((o) => {
    if (o.isBone && o.name === "head") head = o;
    if (drawFace && o.isMesh && /_(Head|Hat)$/.test(o.name)) o.visible = false;
  });
  // Recolor existing garment palette, preserving shadows, leather and metal.
  model.traverse((o) => {
    if (!o.isMesh || !o.material?.map) return;
    const m = o.material.clone();
    owned.push(m);
    o.material = m;
    const isCape = /cape/i.test(o.name),
      isCloth = /Equipped_cloth/.test(o.name);
    m.onBeforeCompile = (shader) => {
      shader.uniforms.heroCloth = { value: new T.Color(a.clothColor) };
      shader.uniforms.heroSkin = { value: new T.Color(a.skin) };
      shader.uniforms.heroAccent = { value: new T.Color(a.accentColor) };
      shader.fragmentShader =
        "uniform vec3 heroCloth; uniform vec3 heroSkin; uniform vec3 heroAccent;\n" +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
    vec3 hc=diffuseColor.rgb;
    float hi=max(hc.r,max(hc.g,hc.b)),lo=min(hc.r,min(hc.g,hc.b));
    bool warmSkin=hc.r>hc.g*1.13 && hc.g>hc.b*1.12 && hc.r>0.42 && hc.g>0.19;
    bool garment=(hi-lo>0.075 && (hc.b>hc.r*0.9 || hc.g>hc.r*0.85)) || ${isCape ? "true" : "false"};
    if(warmSkin) diffuseColor.rgb=heroSkin*(0.65+hi*0.5);
    else if(garment) diffuseColor.rgb=heroCloth*(0.58+hi*0.65);
    ${isCloth ? "else if(hc.r>0.5&&hc.g>0.3&&hc.b<0.25)diffuseColor.rgb=heroAccent*(0.7+hi*0.4);" : ""}
   `,
      );
    };
    m.customProgramCacheKey = () =>
      `identity-${isCape}-${isCloth}-${a.skin}-${a.clothColor}-${a.accentColor}`;
  });
  if (drawFace && head) buildFace();
  finish();
  return a;

  function buildFace() {
  const face = new T.Group();
  face.name = "Individual face";
  head.add(face);
  face.scale.setScalar(look.head);
  const shape = (
    name,
    parent,
    geo,
    mat,
    pos,
    scale = [1, 1, 1],
    rot = null,
  ) => {
    owned.push(geo);
    const m = new T.Mesh(geo, mat);
    m.name = name;
    m.position.set(...pos);
    m.scale.set(...scale);
    if (rot) m.rotation.set(...rot);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const oval = (name, parent, mat, pos, scale, segments = 16) =>
    shape(name, parent, new T.SphereGeometry(1, segments, 12), mat, pos, scale);

  oval(
    "Face",
    face,
    skin,
    [0, 0.38, 0.005],
    [female ? 0.33 : 0.36, 0.43, soft ? 0.33 : 0.31],
  );
  oval("Jaw", face, skin, [0, 0.18, 0.055], [female ? 0.245 : 0.3, 0.22, 0.26]);
  oval(
    "Nose",
    face,
    skin,
    [0, 0.36, 0.31],
    [
      a.face === "weathered" ? 0.09 : 0.065,
      0.115,
      look.ears === "goblin" ? 0.15 : 0.1,
    ],
    8,
  );
  for (const s of [-1, 1]) {
    const eyeSize =
      (look.eyes ?? 1) * (female ? 1.03 : 1) * (sig.bigEyes ? 1.24 : 1);
    oval(
      "Eye white",
      face,
      white,
      [s * 0.145, 0.445, 0.286],
      [0.078 * eyeSize, 0.039 * eyeSize, 0.035],
    );
    oval(
      "Colored iris",
      face,
      iris,
      [s * 0.145, 0.445, 0.322],
      [0.03 * eyeSize, 0.033 * eyeSize, 0.012],
    );
    oval("Pupil", face, dark, [s * 0.145, 0.445, 0.334], [0.013, 0.023, 0.008]);
    oval(
      "Eye glint",
      face,
      white,
      [s * 0.145 - 0.01, 0.46, 0.34],
      [0.009, 0.009, 0.005],
      8,
    );
    const brow = oval(
      "Brow",
      face,
      hair,
      [s * 0.15, 0.532, 0.285],
      [
        0.105 * (sig.brow === "heavy" ? 1.18 : sig.brow === "fine" ? 0.88 : 1),
        sig.brow === "heavy" ? 0.032 : sig.brow === "fine" ? 0.018 : 0.024,
        0.035,
      ],
      10,
    );
    brow.rotation.z = s * (a.face === "weathered" ? 0.18 : -0.08);
    if (sig.brow === "heavy")
      oval("Brow ridge", face, skin, [s * 0.15, 0.55, 0.263], [0.115, 0.03, 0.05], 10);
    if (["pointed", "goblin", "fey"].includes(look.ears)) {
      const geo = new T.ConeGeometry(1, 1, 4),
        ear = shape(
          "Ancestry ear",
          face,
          geo,
          skin,
          [s * 0.39, 0.46, 0],
          [
            look.ears === "goblin" ? 0.19 : 0.11,
            look.ears === "goblin" ? 0.6 : 0.38,
            0.09,
          ],
        );
      ear.rotation.z = -s * 1.03;
      oval(
        "Ear inset",
        face,
        lip,
        [s * 0.375, 0.44, 0.055],
        [0.055, 0.13, 0.035],
        8,
      );
      if (sig.earCuff)
        shape(
          "Ear cuff",
          face,
          new T.TorusGeometry(0.075, 0.016, 5, 12),
          accent,
          [s * 0.4, 0.42, 0.02],
          [1, 1, 1],
          [0, Math.PI / 2, -s * 1.03],
        );
    } else if (look.ears !== "construct")
      oval(
        "Ear",
        face,
        skin,
        [s * 0.345, 0.37, -0.01],
        [0.075, 0.115, 0.065],
        12,
      );
  }
  oval(
    "Mouth",
    face,
    lip,
    [0, 0.185, 0.298],
    [
      (female ? 0.091 : 0.11) * (sig.mouth === "wide" ? 1.34 : 1),
      sig.mouth === "wide" ? 0.024 : 0.018,
      0.017,
    ],
  );
  if (sig.mouth === "wide")
    for (const s of [-1, 1])
      oval("Mouth corner", face, lip, [s * 0.145, 0.19, 0.283], [0.03, 0.016, 0.014], 8);
  if (sig.cheek !== "plain")
    for (const s of [-1, 1]) {
      const shapeOf = {
        high: { p: [s * 0.245, 0.36, 0.235], sc: [0.075, 0.055, 0.055] },
        broad: { p: [s * 0.265, 0.3, 0.21], sc: [0.105, 0.075, 0.07] },
        hollow: { p: [s * 0.235, 0.31, 0.245], sc: [0.055, 0.085, 0.045] },
        round: { p: [s * 0.235, 0.27, 0.245], sc: [0.1, 0.085, 0.075] },
      }[sig.cheek];
      oval("Cheekbone", face, skin, shapeOf.p, shapeOf.sc, 10);
    }
  if (sig.stonePlating)
    for (const s of [-1, 1])
      shape(
        "Ancestry plate",
        face,
        new T.BoxGeometry(0.05, 0.2, 0.03),
        accent,
        [s * 0.29, 0.3, 0.2],
        [1, 1, 1],
        [0, 0, s * 0.18],
      );
  if (sig.circlet) {
    shape(
      "Circlet",
      face,
      new T.TorusGeometry(0.345, 0.018, 5, 18),
      accent,
      [0, 0.52, 0],
      [1, 1, 1],
      [Math.PI / 2 - 0.12, 0, 0],
    );
    shape(
      "Circlet gem",
      face,
      new T.OctahedronGeometry(0.045),
      iris,
      [0, 0.56, 0.3],
      [1, 1.3, 0.5],
    );
  }
  if (a.face === "weathered")
    for (const s of [-1, 1])
      shape(
        "Cheek crease",
        face,
        new T.BoxGeometry(0.08, 0.008, 0.008),
        lip,
        [s * 0.22, 0.32, 0.27],
        [1, 1, 1],
        [0, 0, s * 0.25],
      );
  if (look.ears === "construct") {
    shape(
      "Oath brow seal",
      face,
      new T.OctahedronGeometry(0.065),
      accent,
      [0, 0.6, 0.27],
      [0.65, 1, 0.3],
    );
    for (const s of [-1, 1])
      shape(
        "Construct seam",
        face,
        new T.BoxGeometry(0.012, 0.32, 0.012),
        accent,
        [s * 0.24, 0.3, 0.27],
        [1, 1, 1],
        [0, 0, s * 0.24],
      );
  }
  const lock = (name, points, radius = 0.055, mat = hair) =>
    shape(
      name,
      face,
      new T.TubeGeometry(
        new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
        16,
        radius,
        7,
        false,
      ),
      mat,
      [0, 0, 0],
    );
  if (a.hair !== "shaved") {
    shape(
      "Hair crown",
      face,
      new T.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.4),
      hair,
      [0, 0.4, -0.015],
      [0.365, 0.46, 0.33],
    );
    if (["cropped", "swept", "mohawk"].includes(a.hair))
      for (let i = -2; i <= 2; i++)
        lock(
          "Swept lock",
          [
            [i * 0.075, 0.76, -0.19],
            [i * 0.09 + (a.hair === "swept" ? 0.08 : 0), 0.86, 0.03],
            [i * 0.08 + 0.12, 0.66, 0.28],
          ],
          a.hair === "mohawk" ? 0.048 : 0.07,
        );
    if (["bob", "long", "braid"].includes(a.hair))
      for (const s of [-1, 1])
        for (let i = 0; i < 3; i++)
          lock(
            "Side lock",
            [
              [s * 0.3, 0.64, -0.04 - i * 0.07],
              [s * 0.36, 0.38, -0.02 - i * 0.06],
              [s * 0.32, a.hair === "bob" ? 0.11 : -0.18, -0.08 - i * 0.04],
            ],
            0.065,
          );
    if (a.hair === "long")
      for (let i = -2; i <= 2; i++)
        lock(
          "Back lock",
          [
            [i * 0.12, 0.65, -0.23],
            [i * 0.13, 0.26, -0.34],
            [i * 0.11, -0.28, -0.28],
          ],
          0.095,
        );
    if (a.hair === "braid")
      for (let i = 0; i < 7; i++)
        oval(
          "Hair braid",
          face,
          hair,
          [Math.sin(i * 2.5) * 0.035, 0.28 - i * 0.095, -0.34],
          [0.09 - i * 0.004, 0.08, 0.075],
        );
    if (a.hair === "topknot") {
      oval("Topknot", face, hair, [0, 0.89, -0.08], [0.18, 0.16, 0.16]);
      shape(
        "Hair binding",
        face,
        new T.TorusGeometry(0.13, 0.018, 6, 16),
        accent,
        [0, 0.79, -0.07],
        [1, 1, 1],
        [Math.PI / 2, 0, 0],
      );
    }
  }
  if (a.beard !== "none") {
    if (a.beard !== "goatee")
      for (const s of [-1, 1]) {
        const m = oval(
          "Mustache",
          face,
          hair,
          [s * 0.08, 0.245, 0.32],
          [0.11, a.beard === "stubble" ? 0.015 : 0.042, 0.035],
        );
        m.rotation.z = -s * 0.2;
      }
    if (a.beard !== "mustache") {
      const length = {
        stubble: 0.06,
        goatee: 0.15,
        short: 0.17,
        full: 0.32,
        braided: 0.24,
      }[a.beard];
      oval(
        "Facial hair",
        face,
        hair,
        [0, 0.09 - length * 0.35, 0.235],
        [a.beard === "goatee" ? 0.1 : 0.26, length, 0.15],
      );
      if (a.beard === "braided")
        for (const s of [-1, 1]) {
          for (let i = 0; i < 4; i++)
            oval(
              "Beard braid",
              face,
              hair,
              [s * (0.12 + Math.sin(i * 2) * 0.015), -0.07 - i * 0.08, 0.23],
              [0.07, 0.075, 0.07],
            );
          shape(
            "Beard clasp",
            face,
            new T.CylinderGeometry(0.065, 0.065, 0.045, 10),
            accent,
            [s * 0.12, -0.29, 0.23],
          );
        }
    }
  }
  if (sig.braidRings && a.beard !== "none")
    for (const s of [-1, 1])
      for (let i = 0; i < 2; i += 1)
        shape(
          "Braid ring",
          face,
          new T.TorusGeometry(0.062, 0.014, 5, 10),
          accent,
          [s * 0.12, -0.13 - i * 0.14, 0.232],
          [1, 1, 1],
          [Math.PI / 2, 0, 0],
        );
  }  // end buildFace

  function finish() {
  const build = { slender: 0.9, balanced: 1, broad: 1.13 }[a.build];
  // Ancestry posture and reach, applied to the rig rather than the face.
  if (sig.hunch) {
    const spine = model.getObjectByName("spine") ?? model.getObjectByName("chest");
    if (spine) spine.rotation.x += sig.hunch;
  }
  if (sig.handScale && sig.handScale !== 1)
    for (const hand of ["hand.l", "hand.r", "handl", "handr"]) {
      const bone = model.getObjectByName(hand);
      if (bone) bone.scale.multiplyScalar(sig.handScale);
    }
  if (sig.longNeck && head) head.position.y += 0.12;
  model.scale.set(
    model.scale.x * look.width * build * (female ? 0.96 : 1),
    model.scale.y * look.height,
    model.scale.z * look.width * build,
  );
  model.userData.height = 2.2 * look.height * 0.85;
  dressOutfit(model, hero, owned, opts);
  model.userData.appearance = { ...a, ancestry };
  }  // end finish
}
