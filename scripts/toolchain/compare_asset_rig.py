"""Compare directly preserved GLB skins with their canonical donor (no repairs).

Usage: python3 compare_asset_rig.py donor.glb submission.glb [--tolerance 0.00002]
Direct canonical preservation is the default. A reviewed outer presentation scale
can be factored explicitly with --presentation-scale X Y Z; it is never inferred.
"""
import argparse
import json
import math
from pathlib import Path
import struct


def read_glb(path):
    data = path.read_bytes()
    if data[:4] != b'glTF' or struct.unpack_from('<I', data, 4)[0] != 2:
        raise ValueError('Expected GLB version 2')
    chunks = {}
    cursor = 12
    while cursor < len(data):
        length, kind = struct.unpack_from('<II', data, cursor)
        chunks[kind] = data[cursor + 8:cursor + 8 + length]
        cursor += 8 + length
    return json.loads(chunks[0x4E4F534A]), chunks.get(0x004E4942, b'')


def inverse_binds(doc, binary, skin):
    accessor = doc['accessors'][skin['inverseBindMatrices']]
    view = doc['bufferViews'][accessor['bufferView']]
    if accessor['componentType'] != 5126 or accessor['type'] != 'MAT4' or 'sparse' in accessor:
        raise ValueError('Expected dense float MAT4 inverse binds')
    start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
    stride = view.get('byteStride', 64)
    return [struct.unpack_from('<16f', binary, start + i * stride)
            for i in range(accessor['count'])]


def describe(doc, binary, skin):
    nodes = doc['nodes']
    names = {i: nodes[i]['name'] for i in skin['joints']}
    if len(set(names.values())) != len(names):
        raise ValueError('Duplicate bone names')
    parents = {child: i for i, node in enumerate(nodes) for child in node.get('children', [])}
    matrices = inverse_binds(doc, binary, skin)
    return {names[i]: {
        'parent': names.get(parents.get(i)),
        'translation': nodes[i].get('translation', [0, 0, 0]),
        'rotation': nodes[i].get('rotation', [0, 0, 0, 1]),
        'scale': nodes[i].get('scale', [1, 1, 1]),
        'matrix': nodes[i].get('matrix'),
        'inverseBind': matrices[j],
    } for j, i in enumerate(skin['joints'])}


def compare(donor, candidate, tolerance, presentation_scale=(1.0, 1.0, 1.0)):
    if len(presentation_scale) != 3 or not all(math.isfinite(v) and v > 0 for v in presentation_scale):
        raise ValueError("Presentation scale must contain three finite positive values")
    source_doc, source_bin = read_glb(donor)
    target_doc, target_bin = read_glb(candidate)
    source = describe(source_doc, source_bin, source_doc['skins'][0])
    results = []
    for skin in target_doc.get('skins', []):
        target = describe(target_doc, target_bin, skin)
        missing = sorted(set(source) - set(target))
        extra = sorted(set(target) - set(source))
        parent_mismatches = []
        rest_delta = bind_delta = raw_bind_delta = 0
        for name in source.keys() & target.keys():
            a, b = source[name], target[name]
            if a['parent'] != b['parent']:
                parent_mismatches.append(name)
            if a['matrix'] is not None or b['matrix'] is not None:
                raise ValueError('Matrix-form rest nodes need explicit decomposition review')
            for key in ['translation', 'rotation', 'scale', 'inverseBind']:
                if len(a[key]) != len(b[key]) or not all(math.isfinite(v) for v in (*a[key], *b[key])):
                    raise ValueError('Nonfinite or inconsistent rig data')
                delta = max(abs(x - y) for x, y in zip(a[key], b[key]))
                if key == 'rotation':
                    delta = min(delta, max(abs(x + y) for x, y in zip(a[key], b[key])))
                if key == 'inverseBind':
                    raw_bind_delta = max(raw_bind_delta, delta)
                    # Column-major glTF: inverseBind * presentationScale.
                    factored = [v * presentation_scale[i // 4] if i < 12 else v
                                for i, v in enumerate(b[key])]
                    bind_delta = max(bind_delta, max(abs(x - y) for x, y in zip(a[key], factored)))
                else:
                    rest_delta = max(rest_delta, delta)
        results.append({'skin': skin.get('name'), 'bones': len(target),
                        'missing': missing, 'extra': extra,
                        'parentMismatches': parent_mismatches,
                        'maxLocalRestDelta': rest_delta, 'maxInverseBindDelta': bind_delta,
                        'rawMaxInverseBindDelta': raw_bind_delta,
                        'pass': not missing and not extra and not parent_mismatches
                        and rest_delta <= tolerance and bind_delta <= tolerance})
    return {'donor': str(donor), 'candidate': str(candidate), 'tolerance': tolerance,
            'presentationScale': list(presentation_scale), 'skins': results, 'pass': bool(results) and all(r['pass'] for r in results)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('donor', type=Path)
    parser.add_argument('candidate', type=Path)
    parser.add_argument('--tolerance', type=float, default=0.00002)
    parser.add_argument('--presentation-scale', nargs=3, type=float, default=(1.0, 1.0, 1.0))
    args = parser.parse_args()
    if not math.isfinite(args.tolerance) or args.tolerance <= 0:
        parser.error('tolerance must be finite and positive')
    result = compare(args.donor, args.candidate, args.tolerance, args.presentation_scale)
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result['pass'] else 1)
