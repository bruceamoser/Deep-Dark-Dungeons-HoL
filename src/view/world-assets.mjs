const dungeon = (name) => `/assets/world/dungeon/${name}.gltf`;
export const WORLD_MODELS = {
  floor: dungeon("floor_tile_large"),
  pillar: dungeon("pillar_decorated"),
  wall: dungeon("wall"),
  wallHalf: dungeon("wall_half"),
  wallCracked: dungeon("wall_cracked"),
  wallAlcove: dungeon("wall_inset_shelves_decoratedA"),
  wallCandles: dungeon("wall_inset_candles"),
  wallShelves: dungeon("wall_shelves"),
  torch: dungeon("torch_mounted"),
  rubble: dungeon("rubble_large"),
  barrel: dungeon("barrel_large"),
  table: dungeon("table_small_decorated_A"),
  candles: dungeon("candle_triple"),
  shelf: dungeon("shelf_small_candles"),
  chest: dungeon("chest"),
  stairs: dungeon("stairs_wide"),
  banner: dungeon("banner_patternB_green"),
  archiveBookcase: dungeon("bookcase_single_decoratedA"),
  supplyCrates: dungeon("crates_stacked"),
  cryptCoffin: "/assets/world/crypt/coffin.gltf",
  cryptShrine: "/assets/world/crypt/shrine_candles.gltf",
  cryptBones: "/assets/world/crypt/ribcage.gltf",
  toolAnvil: "/assets/world/tools/anvil.gltf",
  cacheCrate: "/assets/world/resources/Containers_Crate_Medium_Wood.gltf",
};

const STYLES = [
  {
    name: "crypt",
    wall: "wallCracked",
    furniture: ["cryptCoffin", "cryptBones", "barrel"],
  },
  {
    name: "archive",
    wall: "wallShelves",
    furniture: ["archiveBookcase", "table", "supplyCrates"],
  },
  {
    name: "shrine",
    wall: "wallCandles",
    furniture: ["cryptShrine", "candles", "cryptCoffin"],
  },
  {
    name: "storeroom",
    wall: "wallAlcove",
    furniture: ["supplyCrates", "toolAnvil", "barrel"],
  },
];
export function roomArt(map, room) {
  return STYLES[
    Math.abs(Math.trunc(map.seed + map.depth * 17 + room.x * 3 + room.z * 7)) %
      STYLES.length
  ];
}
export function roomDressing(map, room) {
  const style = roomArt(map, room);
  return [
    {
      name: style.furniture[0],
      x: room.x,
      z: room.cz,
      height: 1.7,
      rotation: Math.PI / 2,
    },
    {
      name: style.furniture[1],
      x: room.x + room.w - 1,
      z: room.z + 1,
      height: 1.0,
      rotation: -Math.PI / 2,
    },
    {
      name: style.furniture[2],
      x: room.x + room.w - 2,
      z: room.z + 1,
      height: 0.8,
      rotation: 0,
    },
  ].filter((p) => map.obstacles?.[`${p.x},${p.z}`]);
}
