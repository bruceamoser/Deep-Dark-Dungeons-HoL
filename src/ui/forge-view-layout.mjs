import { disciplinePosition, nodePosition } from "../core/forge-catalog.mjs";
export const CLUSTER_SPACING = 1.55,
  PATH_OFFSET = 225;
export function viewDisciplinePosition(id) {
  const p = disciplinePosition(id);
  return { x: p.x * CLUSTER_SPACING, y: p.y * CLUSTER_SPACING };
}
export function viewNodePosition(n) {
  if (n.kind === "intersection") {
    const p = nodePosition(n);
    return { x: p.x * CLUSTER_SPACING, y: p.y * CLUSTER_SPACING };
  }
  const center = viewDisciplinePosition(n.discipline);
  const path = n.path ? Number(n.path.match(/path(\d+)$/)[1]) : null;
  const angle = -Math.PI / 2 + ((path ?? 0) * Math.PI) / 2,
    offset = path === null ? 0 : PATH_OFFSET - 153;
  return {
    x: center.x + n.local.x + Math.cos(angle) * offset,
    y: center.y + n.local.y + Math.sin(angle) * offset,
  };
}
export const nodeRadius = (n) =>
  n.kind === "origin"
    ? 30
    : n.kind === "intersection"
      ? 27
      : n.kind === "rank"
        ? 16
        : n.power
          ? 17
          : n.minimumRank > 1
            ? 16
            : 11;
export function avoidLabelOverlap({
  world,
  nodes,
  nodeById,
  point,
  scale,
  tx,
  ty,
  width,
  height,
  selected,
  focus,
}) {
  const labels = [...world.querySelectorAll(".forge-node-label")];
  for (const t of labels) {
    t.style.visibility = "hidden";
    t.style.fontSize = `${12 / scale}px`;
  }
  world
    .querySelectorAll(".forge-label-leader")
    .forEach((l) => (l.style.visibility = "hidden"));
  if (scale <= 0.5) return;
  const intersects = (a, b) =>
    a.x < b.x + b.w + 3 &&
    a.x + a.w > b.x - 3 &&
    a.y < b.y + b.h + 3 &&
    a.y + a.h > b.y - 3;
  const circles = nodes.map((n) => {
    const p = point(n),
      r = nodeRadius(n) * scale + 3;
    return {
      x: tx + p.x * scale - r,
      y: ty + p.y * scale - r,
      w: 2 * r,
      h: 2 * r,
    };
  });
  const svgBox = world.ownerSVGElement.getBoundingClientRect();
  for (const contact of world.querySelectorAll(".forge-contact")) {
    const b = contact.getBoundingClientRect();
    circles.push({
      x: b.x - svgBox.x,
      y: b.y - svgBox.y,
      w: b.width,
      h: b.height,
    });
  }
  const occupied = [
    ...world.querySelectorAll(
      ".forge-discipline-name,.forge-path-name,.forge-gate-count",
    ),
  ].map((t) => {
    const b = t.getBBox();
    return {
      x: tx + b.x * scale,
      y: ty + b.y * scale,
      w: b.width * scale,
      h: b.height * scale,
    };
  });
  const candidates = labels
    .map((label) => ({ label, node: nodeById[label.parentNode.dataset.node] }))
    .filter(({ node }) => {
      const p = point(node),
        x = tx + p.x * scale,
        y = ty + p.y * scale;
      return x > -60 && x < width + 60 && y > 0 && y < height;
    });
  const priority = (n) =>
    (n.id === selected ? 100 : 0) + (n.discipline === focus ? 30 : 0);
  candidates.sort((a, b) => priority(b.node) - priority(a.node));
  for (const { label, node } of candidates) {
    const p = point(node),
      cx = tx + p.x * scale,
      cy = ty + p.y * scale,
      r = nodeRadius(node) * scale;
    const tw = label.getComputedTextLength() * scale,
      th = 14;
    const options = [
      [0, -r - 9, "middle"],
      [0, r + 20, "middle"],
      [r + 12, 4, "start"],
      [-r - 12, 4, "end"],
      [r + 12, -r - 12, "start"],
      [-r - 12, -r - 12, "end"],
      [r + 12, r + 18, "start"],
      [-r - 12, r + 18, "end"],
    ];
    for (let row = 1; row < 4; row++)
      options.push(
        [0, -r - 9 - row * 18, "middle"],
        [0, r + 20 + row * 18, "middle"],
      );
    for (const [dx, dy, anchor] of options) {
      const rect = {
        x: cx + dx - (anchor === "middle" ? tw / 2 : anchor === "end" ? tw : 0),
        y: cy + dy - th,
        w: tw,
        h: th,
      };
      if (
        rect.x < 5 ||
        rect.x + tw > width - 5 ||
        rect.y < 48 ||
        rect.y + th > height - 85
      )
        continue;
      if (
        circles.some((c) => intersects(rect, c)) ||
        occupied.some((c) => intersects(rect, c))
      )
        continue;
      label.setAttribute("x", dx / scale);
      label.setAttribute("y", dy / scale);
      label.style.textAnchor = anchor;
      label.style.visibility = "visible";
      const leader = label.parentNode.querySelector(".forge-label-leader");
      if (leader) {
        leader.setAttribute("x2", dx / scale);
        leader.setAttribute("y2", (dy - 6) / scale);
        leader.style.visibility = "visible";
      }
      occupied.push(rect);
      break;
    }
  }
}
