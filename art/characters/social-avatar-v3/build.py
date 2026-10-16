"""Original, isolated Social Avatar V3. Run with Blender --background --python.

Blender coordinates: metres, Z up, facing -Y; glTF export: Y up, facing +Z.
No existing game asset or runtime file is read or changed.
"""

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--render', choices=['none', 'hero', 'all'], default='all')
parser.add_argument('--samples', type=int, default=40)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])

bpy.ops.object.mode_set(mode='OBJECT') if bpy.context.object and bpy.context.object.mode != 'OBJECT' else None
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for block in bpy.data.collections:
    if block.name != 'Collection':
        bpy.data.collections.remove(block)
character = bpy.data.collections.new('SOCIAL_AVATAR_V3 • original design')
bpy.context.scene.collection.children.link(character)
studio = bpy.data.collections.new('STUDIO • excluded from GLB')
bpy.context.scene.collection.children.link(studio)
parts = []


def linear(c):
    return c / 12.92 if c < .04045 else ((c + .055) / 1.055) ** 2.4


def material(name, color, roughness=.65, metallic=0):
    mat = bpy.data.materials.new(name)
    rgb = tuple(linear(int(color[i:i + 2], 16) / 255) for i in (0, 2, 4))
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*rgb, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    return mat


M = {
    'Skin': material('Skin • warm honey', 'DDA77F', .72),
    'Blush': material('Cheeks • peach', 'D68F7F', .8),
    'Ear': material('Ear inset', 'BA785F', .8),
    'Hair': material('Hair • cocoa', '362626', .54),
    'HairLight': material('Hair • caramel sheen', '624038', .48),
    'Ink': material('Lash and brow • espresso', '2D2429', .5),
    'White': material('Eye whites • warm porcelain', 'FFF6E7', .25),
    'Iris': material('Iris • hazel', '8F6740', .3),
    'Pupil': material('Pupil', '171B25', .18),
    'Glint': material('Catchlight', 'FFFFFF', .12),
    'Mouth': material('Smile • terracotta', '874B41', .75),
    'Jacket': material('Jacket • lagoon', '54ACA0', .82),
    'Rib': material('Knit trim • deep lagoon', '337C75', .9),
    'Shirt': material('T-shirt • oat', 'F5ECD9', .9),
    'Shorts': material('Shorts • apricot', 'D68F70', .85),
    'ShortsLight': material('Shorts hem • peach', 'E6A382', .85),
    'Sole': material('Rubber • warm white', 'F2E9D6', .85),
    'Shoe': material('Sneaker • cream', 'DED8C8', .8),
    'ShoeAccent': material('Sneaker accent • tangerine', 'E39A61', .7),
    'Bag': material('Sling bag • plum', '776787', .83),
    'BagEdge': material('Bag piping • grape', '51495F', .8),
    'Gold': material('Hardware • butter', 'EFD79C', .35, .35),
}
M['Skin'].node_tree.nodes['Principled BSDF'].inputs['Subsurface Weight'].default_value = .045


def move_collection(obj, collection):
    for current in list(obj.users_collection):
        current.objects.unlink(obj)
    collection.objects.link(obj)


def register(obj, name, mat, bone='Head'):
    obj.name = name
    move_collection(obj, character)
    obj.data.materials.append(M[mat])
    if obj.type == 'MESH':
        for p in obj.data.polygons:
            p.use_smooth = True
    parts.append((obj, bone))
    return obj


def apply_transform(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.select_set(False)


def uv(name, pos, scale, mat, bone='Head', segments=20, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=pos)
    obj = bpy.context.object
    obj.scale = scale
    apply_transform(obj)
    return register(obj, name, mat, bone)


def mesh(name, vertices, faces, mat, bone='Head', subdivision=0):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    character.objects.link(obj)
    register(obj, name, mat, bone)
    if subdivision:
        mod = obj.modifiers.new('Soft tailored surface', 'SUBSURF')
        mod.levels = subdivision
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def loft(name, rings, mat, bone, segments=24, subdivision=1):
    # Each ring: z, radius x, depth front/back, centre x, centre y.
    verts = []
    for z, rx, ry, x, y in rings:
        for j in range(segments):
            a = j * math.tau / segments
            verts.append((x + rx * math.cos(a), y + ry * math.sin(a), z))
    faces = []
    for k in range(len(rings) - 1):
        for j in range(segments):
            n = (j + 1) % segments
            faces.append((k * segments + j, k * segments + n, (k + 1) * segments + n, (k + 1) * segments + j))
    faces.append(tuple(reversed(range(segments))))
    faces.append(tuple((len(rings) - 1) * segments + j for j in range(segments)))
    return mesh(name, verts, faces, mat, bone, subdivision)


def tube(name, points, radius, mat, bone='Head', resolution=3):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.resolution_u = resolution
    data.bevel_depth = radius
    data.bevel_resolution = 2
    data.use_fill_caps = True
    spline = data.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for p, co in zip(spline.bezier_points, points):
        p.co = co
        p.handle_left_type = 'AUTO'
        p.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, data)
    character.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    register(obj, name, mat, bone)
    obj.select_set(False)
    return obj


def rounded(name, pos, scale, bevel, mat, bone, rotation=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = bpy.context.object
    obj.scale = scale
    apply_transform(obj)
    if rotation:
        obj.rotation_euler = rotation
    mod = obj.modifiers.new('Rounded seams', 'BEVEL')
    mod.width = bevel
    mod.segments = 3
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod = obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return register(obj, name, mat, bone)


# Softly sculpted face, broad temples and cheeks, tapered jaw and chin.
loft('Face', [
    (1.185, .035, .055, 0, -.005), (1.20, .105, .115, 0, -.018),
    (1.25, .185, .175, 0, -.009), (1.33, .236, .208, 0, .002),
    (1.42, .25, .211, 0, .006), (1.52, .25, .208, 0, .01),
    (1.61, .225, .192, 0, .017), (1.68, .162, .147, 0, .018),
    (1.71, .075, .07, 0, .018), (1.714, .008, .008, 0, .018),
], 'Skin', 'Head', 40, 1)
uv('Neck', (0, .005, 1.17), (.075, .07, .105), 'Skin', 'Neck')
for sign, side in [(-1, 'Right'), (1, 'Left')]:
    uv(f'Ear.{side}', (sign * .243, .007, 1.362), (.045, .038, .067), 'Skin')
    uv(f'EarInset.{side}', (sign * .268, -.017, 1.361), (.018, .011, .035), 'Ear')
    # Thin face-conforming blush patches, never floating oval solids.
    face = bpy.data.objects['Face']
    hit, location, normal, index = face.ray_cast(Vector((sign * .16, -1, 1.32)), Vector((0, 1, 0)))
    patch = [(sign * .16, location.y - .0007, 1.32)]
    for k in range(1, 4):
        radius = k / 3
        for j in range(24):
            angle = math.tau * j / 24
            x = sign * .16 + math.cos(angle) * .031 * radius
            z = 1.32 + math.sin(angle) * .012 * radius
            hit, location, normal, index = face.ray_cast(Vector((x, -1, z)), Vector((0, 1, 0)))
            patch.append((x, location.y - .0007 if hit else -.16, z))
    faces = [(0, 1 + j, 1 + (j + 1) % 24) for j in range(24)]
    faces += [(1 + i * 24 + j, 1 + (i + 1) * 24 + j, 1 + (i + 1) * 24 + (j + 1) % 24, 1 + i * 24 + (j + 1) % 24) for i in range(2) for j in range(24)]
    mesh(f'Cheek.{side}', patch, faces, 'Blush')

# Expressive almond eyes with sculpted upper lids and small two-point glints.
for sign, side in [(-1, 'Right'), (1, 'Left')]:
    x = sign * .103
    uv(f'EyeWhite.{side}', (x, -.189, 1.408), (.078, .026, .055), 'White', segments=32, rings=20)
    uv(f'IrisRim.{side}', (x, -.213, 1.406), (.040, .009, .047), 'Ink')
    uv(f'Iris.{side}', (x, -.220, 1.405), (.0325, .007, .039), 'Iris')
    uv(f'Pupil.{side}', (x, -.226, 1.410), (.021, .006, .031), 'Pupil')
    uv(f'EyeGlint.{side}', (x - .012, -.232, 1.431), (.011, .0035, .013), 'Glint', segments=16, rings=10)
    uv(f'EyeGlintSmall.{side}', (x + .014, -.231, 1.389), (.0045, .003, .005), 'Glint', segments=12, rings=8)
    tube(f'UpperLid.{side}', [(x - .075, -.193, 1.412), (x - .046, -.211, 1.453), (x + .006, -.216, 1.465), (x + .054, -.203, 1.447), (x + .076, -.187, 1.416)], .0055, 'Ink')
    tube(f'LowerLid.{side}', [(x - .069, -.194, 1.396), (x, -.211, 1.355), (x + .067, -.190, 1.393)], .0025, 'Ear')
    tube(f'Brow.{side}', [(x - .058, -.179, 1.502), (x - .016, -.202, 1.519), (x + .030, -.195, 1.514), (x + .058, -.174, 1.501)], .009, 'Hair')
uv('Nose', (0, -.205, 1.338), (.025, .026, .024), 'Skin', segments=24, rings=12)
smile_points = []
for x, z in [(-.041, 1.280), (-.018, 1.272), (.009, 1.271), (.035, 1.281)]:
    hit, location, normal, index = bpy.data.objects['Face'].ray_cast(Vector((x, -1, z)), Vector((0, 1, 0)))
    smile_points.append((x, location.y - .001, z))
tube('Smile', smile_points, .003, 'Mouth')

# Hair shell with a shaped hairline: high at forehead, long at the back.
verts, faces = [], []
nr, ns = 16, 48
for i in range(nr + 1):
    t = (i + .04) / (nr + .04)
    for j in range(ns):
        a = j * math.tau / ns
        front = max(0, -math.sin(a))
        theta_end = 2.20 - 1.12 * front ** 3
        theta = t * theta_end
        verts.append((.267 * math.sin(theta) * math.cos(a), .025 + .239 * math.sin(theta) * math.sin(a), 1.452 + .286 * math.cos(theta)))
for i in range(nr):
    for j in range(ns):
        n = (j + 1) % ns
        faces.append((i * ns + j, i * ns + n, (i + 1) * ns + n, (i + 1) * ns + j))
faces.append(tuple(reversed(range(ns))))
mesh('Hair_SculptedCap', verts, faces, 'Hair', subdivision=1)


def hairlock(name, points, widths, depths, mat='Hair'):
    # Elliptical swept locks; flattened depth keeps a sculpted ribbon silhouette.
    verts, faces = [], []
    for i, p in enumerate(points):
        tangent = Vector(points[min(i + 1, len(points) - 1)]) - Vector(points[max(0, i - 1)])
        across = Vector((tangent.z, 0, -tangent.x)).normalized()
        for j in range(12):
            a = j * math.tau / 12
            v = Vector(p) + across * (math.cos(a) * widths[i]) + Vector((0, math.sin(a) * depths[i], 0))
            verts.append(v)
    for i in range(len(points) - 1):
        for j in range(12):
            n = (j + 1) % 12
            faces.append((i * 12 + j, i * 12 + n, (i + 1) * 12 + n, (i + 1) * 12 + j))
    faces.extend([tuple(reversed(range(12))), tuple((len(points) - 1) * 12 + j for j in range(12))])
    return mesh(name, verts, faces, mat, subdivision=2)


hairlock('Hair_SweptFringe_A', [(.125, -.065, 1.715), (.100, -.157, 1.679), (.015, -.209, 1.622), (-.091, -.212, 1.555), (-.191, -.174, 1.493), (-.228, -.105, 1.408)], [.012, .055, .072, .067, .045, .002], [.008, .028, .037, .033, .029, .002])
hairlock('Hair_SweptFringe_B', [(.108, -.084, 1.714), (.180, -.134, 1.655), (.228, -.133, 1.563), (.252, -.083, 1.460), (.236, -.064, 1.331)], [.006, .039, .046, .037, .003], [.004, .029, .035, .031, .002])
for sign, side in [(-1, 'Right'), (1, 'Left')]:
    hairlock(f'Hair_SideLock.{side}', [(sign * .23, .004, 1.608), (sign * .274, .016, 1.483), (sign * .278, .030, 1.339), (sign * .246, .047, 1.227)], [.018, .052, .049, .003], [.014, .071, .066, .003])
tube('Hair highlight A', [(.079, -.182, 1.680), (-.012, -.243, 1.617), (-.102, -.243, 1.554), (-.168, -.208, 1.511)], .0028, 'HairLight')
tube('Hair highlight B', [(.172, -.161, 1.660), (.217, -.173, 1.575), (.243, -.126, 1.482)], .002, 'HairLight')
rounded('HairClip_A', (.224, -.168, 1.514), (.055, .013, .013), .005, 'Gold', 'Head', (0, -.35, -.4))
rounded('HairClip_B', (.230, -.153, 1.491), (.043, .012, .011), .004, 'Gold', 'Head', (0, -.35, -.4))

# Tailored body: slightly oversized jacket, visible tee insert, ribbed hem.
loft('Jacket_Body', [( .728, .148, .094, 0, .008), (.75, .174, .112, 0, .005), (.85, .176, .113, 0, .006), (1.02, .176, .108, 0, .008), (1.09, .169, .095, 0, .009), (1.125, .118, .073, 0, .008), (1.13, .067, .057, 0, .005)], 'Jacket', 'TORSO', 32, 1)
loft('Jacket_RibbedHem', [(.718, .145, .092, 0, .008), (.725, .157, .101, 0, .008), (.762, .158, .102, 0, .008), (.77, .155, .099, 0, .008)], 'Rib', 'Hips', 32, 1)
mesh('Shirt_Insert', [(-.060, -.060, 1.135), (-.030, -.072, 1.112), (0, -.078, 1.108), (.030, -.072, 1.112), (.060, -.060, 1.135), (.071, -.094, 1.082), (.059, -.117, 1.022), (0, -.122, .95), (-.059, -.117, 1.022), (-.071, -.094, 1.082)], [tuple(range(10))], 'Shirt', 'Chest')
tube('Shirt crew neckline', [(-.060, -.063, 1.135), (-.033, -.076, 1.115), (0, -.082, 1.110), (.033, -.076, 1.115), (.060, -.063, 1.135)], .006, 'Shirt', 'Chest')
tube('Jacket zipper', [(0, -.113, .755), (0, -.120, .85), (0, -.120, .945)], .004, 'Gold', 'TORSO')
rounded('Zipper pull', (0, -.130, .929), (.015, .008, .029), .004, 'Gold', 'Chest')
for sign, side in [(-1, 'Right'), (1, 'Left')]:
    tube(f'Jacket lapel.{side}', [(sign * .057, -.061, 1.141), (sign * .092, -.086, 1.101), (sign * .064, -.124, 1.017), (sign * .011, -.124, .947)], .010, 'Rib', 'Chest')
    tube(f'Pocket welt.{side}', [(sign * .054, -.119, .827), (sign * .113, -.104, .874)], .007, 'Rib', 'Spine')
    tube(f'Jacket side seam.{side}', [(sign * .147, -.062, .77), (sign * .164, -.057, .91), (sign * .16, -.05, 1.033)], .002, 'Rib', 'TORSO')
uv('Chest enamel pin', (-.102, -.112, 1.035), (.019, .005, .019), 'Gold', 'Chest', segments=20, rings=10)
tube('Pin sprout', [(-.11, -.119, 1.029), (-.101, -.121, 1.042), (-.093, -.119, 1.035)], .002, 'Rib', 'Chest')

# Arms follow a relaxed A-pose. Arm skinning blends at elbows.
for sign, side in [(-1, 'Right'), (1, 'Left')]:
    shoulder = (sign * .168, 0, 1.065)
    elbow = (sign * .267, -.004, .909)
    wrist = (sign * .316, -.014, .767)
    loft(f'Jacket_Sleeve.{side}', [(.768, .047, .054, sign * .316, -.014), (.80, .058, .063, sign * .307, -.009), (.91, .063, .067, sign * .267, -.004), (1.019, .073, .077, sign * .213, 0), (1.067, .070, .071, sign * .172, 0), (1.098, .035, .043, sign * .164, 0)], 'Jacket', 'ARM.' + side, 20, 1)
    loft(f'Cuff.{side}', [(.751, .044, .049, sign * .319, -.014), (.759, .048, .053, sign * .317, -.014), (.797, .048, .054, sign * .307, -.012), (.803, .044, .050, sign * .306, -.011)], 'Rib', side + 'LowerArm', 20, 1)
    uv(f'Hand.{side}', (sign * .327, -.016, .708), (.047, .036, .067), 'Skin', side + 'Hand')
    thumb = uv(f'Thumb.{side}', (sign * .286, -.038, .722), (.021, .024, .035), 'Skin', side + 'Hand', segments=16, rings=12)
    thumb.rotation_euler[1] = sign * -.34
    for j in range(3):
        tube(f'CuffRib{j}.{side}', [(sign * (.284 + j * .017), -.062, .762), (sign * (.276 + j * .017), -.063, .792)], .0015, 'Jacket', side + 'LowerArm')

# Shorts with separate tailored legs and rolled hems.
loft('Shorts_Hip', [(.602, .128, .084, 0, .01), (.65, .153, .096, 0, .009), (.733, .145, .092, 0, .007), (.755, .13, .08, 0, .007)], 'Shorts', 'Hips', 28, 1)
for sign, side in [(-1, 'Right'), (1, 'Left')]:
    x = sign * .09
    loft(f'Shorts_Leg.{side}', [(.535, .077, .085, x, .009), (.554, .083, .090, x, .009), (.647, .086, .093, x, .009), (.687, .077, .085, x, .009)], 'Shorts', side + 'UpperLeg', 24, 1)
    loft(f'Shorts_Hem.{side}', [(.531, .079, .086, x, .009), (.54, .085, .092, x, .009), (.563, .085, .092, x, .009), (.568, .08, .087, x, .009)], 'ShortsLight', side + 'UpperLeg', 24, 1)
    loft(f'Leg.{side}', [(.16, .043, .046, x, .002), (.20, .047, .049, x, .005), (.30, .053, .054, x, .009), (.405, .057, .058, x, -.006), (.49, .063, .063, x, .005), (.564, .063, .067, x, .008)], 'Skin', 'LEG.' + side, 20, 1)
    loft(f'Sock.{side}', [(.12, .043, .048, x, 0), (.135, .048, .053, x, 0), (.234, .048, .051, x, .005), (.241, .044, .048, x, .005)], 'Shirt', side + 'LowerLeg', 20, 1)
    loft(f'SockStripe.{side}', [(.214, .049, .052, x, .005), (.226, .049, .052, x, .005)], 'Rib', side + 'LowerLeg', 20, 0)
    rounded(f'Sneaker_Sole.{side}', (x, -.036, .040), (.151, .260, .078), .032, 'Sole', side + 'Foot')
    rounded(f'Sneaker_Upper.{side}', (x, -.041, .102), (.137, .232, .121), .045, 'Shoe', side + 'Foot')
    rounded(f'Sneaker_Toe.{side}', (x, -.121, .089), (.137, .092, .067), .030, 'Shirt', side + 'Foot')
    rounded(f'Sneaker_Heel.{side}', (x, .071, .112), (.109, .021, .065), .01, 'Rib', side + 'Foot')
    rounded(f'Sneaker_Tongue.{side}', (x, -.030, .166), (.066, .081, .018), .008, 'Shirt', side + 'Foot', (.10, 0, 0))
    for j in range(3):
        tube(f'Lace{j}.{side}', [(x - .032, -.066 + j * .021, .158 + j * .004), (x, -.061 + j * .021, .170 + j * .004), (x + .032, -.066 + j * .021, .158 + j * .004)], .0038, 'Sole', side + 'Foot')
    tube(f'Sneaker side flash.{side}', [(x + sign * .070, -.09, .095), (x + sign * .072, -.023, .118), (x + sign * .069, .032, .102)], .009, 'ShoeAccent', side + 'Foot')

# Unify the shorts volume so its crotch and thigh pieces have no visible joins.
shorts_parts = [o for o, _ in parts if o.name == 'Shorts_Hip' or o.name.startswith('Shorts_Leg.')]
parts = [(o, b) for o, b in parts if o not in shorts_parts]
bpy.ops.object.select_all(action='DESELECT')
for obj in shorts_parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = shorts_parts[0]
bpy.ops.object.join()
shorts = bpy.context.object
shorts.name = 'Shorts_Tailored'
shorts.data.remesh_voxel_size = .007
bpy.ops.object.voxel_remesh()
smooth = shorts.modifiers.new('Smooth garment union', 'SMOOTH')
smooth.factor = .9
smooth.iterations = 6
bpy.ops.object.modifier_apply(modifier=smooth.name)
decimate = shorts.modifiers.new('Garment topology budget', 'DECIMATE')
decimate.ratio = .45
bpy.ops.object.modifier_apply(modifier=decimate.name)
for p in shorts.data.polygons:
    p.use_smooth = True
parts.append((shorts, 'SHORTS'))

# Small sling backpack, a back-view reward and readable fashion silhouette.
rounded('Bag_Main', (.036, .151, .94), (.224, .112, .255), .048, 'Bag', 'Chest')
rounded('Bag_FrontPocket', (.036, .213, .915), (.174, .031, .117), .022, 'BagEdge', 'Chest')
tube('Bag pocket zipper', [(-.038, .233, .951), (.037, .237, .957), (.111, .233, .951)], .003, 'Gold', 'Chest')
rounded('Bag label', (.036, .234, .914), (.042, .005, .022), .004, 'Shirt', 'Chest')
tube('Bag carry loop', [(-.005, .146, 1.062), (0, .151, 1.102), (.044, .151, 1.104), (.066, .146, 1.063)], .009, 'BagEdge', 'Chest')
for sign, side in [(-1, 'Right'), (1, 'Left')]:
    tube(f'Bag strap.{side}', [(.036 + sign * .065, .151, 1.023), (sign * .122, .060, 1.107), (sign * .139, -.044, 1.077), (sign * .142, -.082, .971), (sign * .137, .045, .858), (.036 + sign * .060, .151, .854)], .013, 'BagEdge', 'TORSO')

# Twenty-bone humanoid rig. Rest-pose transforms are independent from V2.
armdata = bpy.data.armatures.new('SocialAvatarV3_Skeleton')
rig = bpy.data.objects.new('SocialAvatarV3_Rig', armdata)
character.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')


def bone(name, head, tail, parent=None):
    b = armdata.edit_bones.new(name)
    b.head, b.tail = head, tail
    if parent:
        b.parent = armdata.edit_bones[parent]
    return b


bone('Root', (0, 0, 0), (0, 0, .16))
bone('Hips', (0, 0, .70), (0, 0, .81), 'Root')
bone('Spine', (0, 0, .81), (0, 0, .98), 'Hips')
bone('Chest', (0, 0, .98), (0, 0, 1.105), 'Spine')
bone('Neck', (0, 0, 1.105), (0, 0, 1.23), 'Chest')
bone('Head', (0, 0, 1.23), (0, 0, 1.66), 'Neck')
for sign, side in [(-1, 'Right'), (1, 'Left')]:
    bone(side + 'Shoulder', (sign * .05, 0, 1.07), (sign * .168, 0, 1.065), 'Chest')
    bone(side + 'UpperArm', (sign * .168, 0, 1.065), (sign * .267, -.004, .909), side + 'Shoulder')
    bone(side + 'LowerArm', (sign * .267, -.004, .909), (sign * .316, -.014, .767), side + 'UpperArm')
    bone(side + 'Hand', (sign * .316, -.014, .767), (sign * .327, -.016, .676), side + 'LowerArm')
    bone(side + 'UpperLeg', (sign * .09, 0, .70), (sign * .09, -.006, .405), 'Hips')
    bone(side + 'LowerLeg', (sign * .09, -.006, .405), (sign * .09, 0, .142), side + 'UpperLeg')
    bone(side + 'Foot', (sign * .09, 0, .142), (sign * .09, -.13, .08), side + 'LowerLeg')
bpy.ops.object.mode_set(mode='OBJECT')
rig.show_in_front = True
armdata.display_type = 'OCTAHEDRAL'


def clamp(x):
    return max(0, min(1, x))


for obj, binding in parts:
    groups = {}
    for v in obj.data.vertices:
        z = (obj.matrix_world @ v.co).z
        if binding == 'SHORTS':
            x = (obj.matrix_world @ v.co).x
            w = clamp((z - .59) / .11)
            side = 'Left' if x > 0 else 'Right'
            weights = [('Hips', w), (side + 'UpperLeg', 1 - w)]
        elif binding == 'TORSO':
            w = clamp((z - .86) / .17)
            weights = [('Spine', 1 - w), ('Chest', w)]
        elif binding.startswith('ARM.'):
            side = binding.split('.')[1]
            w = clamp((z - .87) / .09)
            weights = [(side + 'UpperArm', w), (side + 'LowerArm', 1 - w)]
        elif binding.startswith('LEG.'):
            side = binding.split('.')[1]
            w = clamp((z - .37) / .08)
            weights = [(side + 'UpperLeg', w), (side + 'LowerLeg', 1 - w)]
        else:
            weights = [(binding, 1)]
        for name, weight in weights:
            if weight > 0:
                group = groups.get(name)
                if group is None:
                    group = obj.vertex_groups.new(name=name)
                    groups[name] = group
                group.add([v.index], weight, 'REPLACE')
    mod = obj.modifiers.new('Social V3 skin', 'ARMATURE')
    mod.object = rig
    obj.parent = rig

# Join compatible material pieces: retain editability through mesh islands and
# vertex groups while keeping the exported draw-call count modest.
joined = []
material_parts = {mat.name: [o for o, _ in parts if o.data.materials[0] == mat] for mat in M.values()}
for mat in M.values():
    items = material_parts[mat.name]
    if not items:
        continue
    bpy.ops.object.select_all(action='DESELECT')
    for obj in items:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = items[0]
    if len(items) > 1:
        bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = 'V3_' + mat.name.split(' • ')[0].replace(' ', '_')
    joined.append(obj)
parts = [(obj, '') for obj in joined]

# Two gentle authored demonstration clips. Gameplay retargeting is separate.
bpy.context.scene.render.fps = 30
rig.animation_data_create()
for action_name, end in [('Idle', 90), ('Wave', 60)]:
    action = bpy.data.actions.new(action_name)
    rig.animation_data.action = action
    for frame in range(1, end + 1, 3):
        t = (frame - 1) / (end - 1)
        for pb in rig.pose.bones:
            pb.rotation_mode = 'XYZ'
            pb.rotation_euler = (0, 0, 0)
        rig.pose.bones['Chest'].rotation_euler[0] = math.sin(t * math.tau) * .015
        rig.pose.bones['Head'].rotation_euler[1] = math.sin(t * math.tau) * .025
        if action_name == 'Wave':
            envelope = min(1, t * 5, (1 - t) * 5)
            rig.pose.bones['LeftUpperArm'].rotation_euler[2] = -1.75 * envelope
            rig.pose.bones['LeftLowerArm'].rotation_euler[2] = -.38 * envelope
            rig.pose.bones['LeftHand'].rotation_euler[2] = math.sin(t * math.tau * 3) * .24 * envelope
            rig.pose.bones['Head'].rotation_euler[1] = -.08 * envelope
        for pb in rig.pose.bones:
            if pb.name != 'Root':
                pb.keyframe_insert(data_path='rotation_euler', frame=frame, group=pb.name)
    # Exact closure at last frame, preserving a seamless idle loop.
    for pb in rig.pose.bones:
        pb.rotation_euler = (0, 0, 0)
        if pb.name != 'Root':
            pb.keyframe_insert(data_path='rotation_euler', frame=end, group=pb.name)
    track = rig.animation_data.nla_tracks.new()
    track.name = action_name
    strip = track.strips.new(action_name, 1, action)
    track.mute = True
rig.animation_data.action = None
for pb in rig.pose.bones:
    pb.rotation_euler = (0, 0, 0)
bpy.context.scene.frame_set(1)
rig['version'] = 'Social Avatar V3 — original Blender concept; not a V2 replacement'
rig['authoring_units'] = 'metres; Z up; front -Y; ground z=0.001'
rig['runtime_status'] = 'isolated concept; gameplay animations and wardrobe adapter not connected'

# Export character only; keep studio camera/lights out of the runtime GLB.
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
for obj, _ in parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = rig
export = ROOT / 'public/assets/characters/social-avatar-v3.glb'
export.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(export), export_format='GLB', use_selection=True,
    export_yup=True, export_animations=True, export_animation_mode='ACTIONS',
    export_skins=True, export_all_influences=False, export_materials='EXPORT',
    export_cameras=False, export_lights=False, export_extras=True)

# Presentation studio. Everything below is excluded from the GLB.
def studio_object(obj, name):
    obj.name = name
    move_collection(obj, studio)
    return obj


floor_mat = material('Studio • warm ivory', 'E8E5DB', .92)
platform_mat = material('Studio • mist', 'B8CCC4', .85)
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.055))
floor = studio_object(bpy.context.object, 'Studio floor')
floor.data.materials.append(floor_mat)
bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=.63, depth=.05, location=(0, 0, -.026))
platform = studio_object(bpy.context.object, 'Display plinth')
platform.data.materials.append(platform_mat)
bevel = platform.modifiers.new('Soft plinth edge', 'BEVEL')
bevel.width = .018
bevel.segments = 3
for p in platform.data.polygons:
    p.use_smooth = True


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def area(name, pos, energy, color, size):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy, data.color, data.shape, data.size = energy, color, 'DISK', size
    obj = bpy.data.objects.new(name, data)
    studio.objects.link(obj)
    obj.location = pos
    aim(obj, (0, 0, .9))


area('Key • large softbox', (-3, -4, 5), 380, (1, .88, .75), 4)
area('Fill • cool bounce', (3, -1, 3), 210, (.78, .9, 1), 3)
area('Rim • warm', (1, 3, 4), 430, (1, .85, .65), 2.5)
world = bpy.data.worlds.new('Soft studio ambient')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (.65, .72, .78, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = .35
bpy.context.scene.world = world
camdata = bpy.data.cameras.new('Portrait camera')
camera = bpy.data.objects.new('Portrait camera', camdata)
studio.objects.link(camera)
camdata.type = 'ORTHO'
camdata.ortho_scale = 2.22
camera.location = (2.65, -5.8, 2.50)
aim(camera, (0, 0, .87))
scene = bpy.context.scene
scene.camera = camera
scene.render.engine = 'CYCLES'
scene.cycles.samples = args.samples
scene.cycles.use_denoising = True
scene.cycles.device = 'CPU'
scene.render.resolution_x = 960
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'
scene.render.film_transparent = False
scene.frame_start, scene.frame_end = 1, 90
# Ready-to-inspect viewport on opening the .blend.
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
for screen in bpy.data.screens:
    for space in screen.areas:
        if space.type == 'VIEW_3D':
            space.spaces.active.region_3d.view_perspective = 'CAMERA'
            space.spaces.active.shading.type = 'MATERIAL'
bpy.context.preferences.filepaths.save_version = 0
rig.animation_data.action = bpy.data.actions['Idle']
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(HERE / 'social-avatar-v3.blend'))
stats = {
    'name': 'Social Avatar V3', 'blender': bpy.app.version_string,
    'meshes': len(parts), 'bones': len(rig.data.bones),
    'triangles': sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o, _ in parts),
    'vertices': sum(len(o.data.vertices) for o, _ in parts),
    'animations': ['Idle', 'Wave'], 'glb_bytes': export.stat().st_size,
    'bounds_blender': {axis: [min((o.matrix_world @ v.co)[i] for o, _ in parts for v in o.data.vertices), max((o.matrix_world @ v.co)[i] for o, _ in parts for v in o.data.vertices)] for i, axis in enumerate(['x', 'y', 'z'])},
}
(HERE / 'asset-report.json').write_text(json.dumps(stats, indent=2) + '\n')
print('SOCIAL_AVATAR_V3', json.dumps(stats), flush=True)
if args.render != 'none':
    views = [('hero', (2.65, -5.8, 2.50))]
    if args.render == 'all':
        views += [('front', (0, -6, 1.6)), ('side', (6, 0, 1.6)), ('back', (0, 6, 1.6)), ('wave', (2.65, -5.8, 2.50))]
    for name, location in views:
        if name == 'wave':
            rig.animation_data.action = bpy.data.actions['Wave']
            scene.frame_set(30)
        camera.location = location
        aim(camera, (0, 0, .87))
        scene.render.filepath = str(HERE / (name + '.png'))
        bpy.ops.render.render(write_still=True)
        print('RENDER_READY', name, flush=True)
print('SOCIAL_AVATAR_V3_COMPLETE', flush=True)
