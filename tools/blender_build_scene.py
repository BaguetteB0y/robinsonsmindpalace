"""
Build a complete .blend file matching the current R3F scene
============================================================

Builds the room shell (walls, floor, window/door cutouts, labels) AND
imports the bed at its current R3F position, then saves the result as
a .blend file at tools/scene_from_r3f.blend.

Run in Blender's Scripting tab once. After it finishes, you can either:
  - keep working in the running Blender window, or
  - File -> Open -> tools/scene_from_r3f.blend later

Re-running the script overwrites the saved .blend.

Source of truth: src/scene/Room.tsx for room dimensions, src/scene/Bed.tsx
for bed placement defaults. If you tweak those in code, rerun this
script to regenerate the .blend.

Axis convention: in Blender, +Y is "south" of the room, -Y is "north"
(where the window is). This is because Blender's glTF exporter maps
Blender +Y -> three.js -Z, and R3F has +Z = north. Trust the labeled
NORTH/SOUTH text markers, not Blender's grid orientation.
"""

import bpy
import os
from math import radians

# ---------------------------------------------------------------------
# Edit if you move the project directory
# ---------------------------------------------------------------------
PROJECT_ROOT = r"C:\Users\robin\Desktop\Website project"
BED_GLB = os.path.join(PROJECT_ROOT, "public", "models", "bed_ps1_v3_1.glb")
OUTPUT_BLEND = os.path.join(PROJECT_ROOT, "tools", "scene_from_r3f.blend")

# ---------------------------------------------------------------------
# Room config - keep in sync with src/scene/Room.tsx (R object)
# ---------------------------------------------------------------------
W = 5.5
D = 8.0
H = 2.7
T = 0.15
FW = 2.0
FD = 2.0
WIN_SILL = 0.8
WIN_W = 1.5
DOOR_W = 0.95
DOOR_H = 2.05

# ---------------------------------------------------------------------
# Bed defaults (mirrors Bed.tsx's computed placement: NE corner, head
# against east wall flush, side flush with north wall)
# ---------------------------------------------------------------------
BED_FRAME_L = 2.05
BED_FRAME_W = 1.55

half_w = W / 2
half_d = D / 2
east_interior = half_w - T / 2
north_interior = half_d - T / 2

BED_R3F_X = (east_interior - 0.02) - BED_FRAME_L / 2
BED_R3F_Y = 0.0
BED_R3F_Z = (north_interior - 0.02) - BED_FRAME_W / 2
BED_ROT_Y_DEG = 0.0


def by(three_z: float) -> float:
    """Convert R3F Z (north = +Z) to Blender Y (north = -Y)."""
    return -three_z


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------
def clear_existing(coll_names):
    for coll_name in coll_names:
        coll = bpy.data.collections.get(coll_name)
        if not coll:
            continue
        for obj in list(coll.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(coll)


def get_or_make_collection(name):
    coll = bpy.data.collections.get(name)
    if coll:
        return coll
    coll = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(coll)
    return coll


def make_material(name, rgb, alpha=1.0):
    mat = bpy.data.materials.get(name)
    if mat:
        bpy.data.materials.remove(mat)
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
        bsdf.inputs["Roughness"].default_value = 1.0
        if alpha < 1.0:
            mat.blend_method = "BLEND"
            bsdf.inputs["Alpha"].default_value = alpha
    return mat


def move_to_collection(obj, collection):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    collection.objects.link(obj)


def add_box(name, location, size, material, collection):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    move_to_collection(obj, collection)
    return obj


def add_label(text, location, collection, size=0.35):
    bpy.ops.object.text_add(location=location)
    obj = bpy.context.active_object
    obj.name = f"Label_{text.replace(' ', '_')}"
    obj.data.body = text
    obj.data.size = size
    obj.data.align_x = "CENTER"
    obj.rotation_euler = (radians(90), 0, 0)
    move_to_collection(obj, collection)
    return obj


# ---------------------------------------------------------------------
# Build room
# ---------------------------------------------------------------------
def build_room():
    stage = get_or_make_collection("Room_Stage")
    markers = get_or_make_collection("Markers")

    wall_mat = make_material("Stage_Wall", (0.85, 0.78, 0.69))
    floor_mat = make_material("Stage_Floor", (0.45, 0.30, 0.20))
    win_mat = make_material("Stage_Window", (1.0, 0.7, 0.45), alpha=0.5)
    door_mat = make_material("Stage_Door", (0.4, 0.3, 0.2), alpha=0.5)

    f_east_x = half_w
    f_west_x = half_w - FW
    f_cx = (f_east_x + f_west_x) / 2
    f_north_z = -half_d
    f_south_z = -half_d - FD
    f_center_z = (f_north_z + f_south_z) / 2

    add_box("Floor_Main", (0, by(0), -0.025), (W, D, 0.05), floor_mat, stage)
    add_box(
        "Floor_Foyer",
        (f_cx, by(f_center_z), -0.025),
        (FW, FD, 0.05),
        floor_mat,
        stage,
    )

    n_z = half_d
    win_left_x = half_w - WIN_W
    win_cx = (win_left_x + half_w) / 2
    left_len = win_left_x - (-half_w)
    lintel_h = 0  # window goes to ceiling

    add_box(
        "Wall_North_Left",
        (-half_w + left_len / 2, by(n_z), H / 2),
        (left_len, T, H),
        wall_mat,
        stage,
    )
    add_box(
        "Wall_North_Sill",
        (win_cx, by(n_z), WIN_SILL / 2),
        (WIN_W, T, WIN_SILL),
        wall_mat,
        stage,
    )
    if lintel_h > 0.001:
        add_box(
            "Wall_North_Lintel",
            (win_cx, by(n_z), H - lintel_h / 2),
            (WIN_W, T, lintel_h),
            wall_mat,
            stage,
        )
    add_box(
        "Marker_Window",
        (win_cx, by(n_z), WIN_SILL + (H - WIN_SILL) / 2),
        (WIN_W, T * 0.4, H - WIN_SILL),
        win_mat,
        markers,
    )

    e_north = half_d
    e_south = -half_d - FD
    e_len = e_north - e_south
    e_center = (e_north + e_south) / 2
    add_box(
        "Wall_East",
        (half_w, by(e_center), H / 2),
        (T, e_len, H),
        wall_mat,
        stage,
    )

    add_box(
        "Wall_West",
        (-half_w, by(0), H / 2),
        (T, D, H),
        wall_mat,
        stage,
    )

    s_main_west_len = f_west_x - (-half_w)
    add_box(
        "Wall_South_Main",
        (-half_w + s_main_west_len / 2, by(-half_d), H / 2),
        (s_main_west_len, T, H),
        wall_mat,
        stage,
    )

    add_box(
        "Wall_Foyer_West",
        (f_west_x, by(f_center_z), H / 2),
        (T, FD, H),
        wall_mat,
        stage,
    )

    door_left_x = f_cx - DOOR_W / 2
    door_right_x = f_cx + DOOR_W / 2
    f_south_left_len = door_left_x - f_west_x
    f_south_right_len = f_east_x - door_right_x
    door_lintel_h = H - DOOR_H

    if f_south_left_len > 0.001:
        add_box(
            "Wall_Foyer_South_Left",
            (f_west_x + f_south_left_len / 2, by(f_south_z), H / 2),
            (f_south_left_len, T, H),
            wall_mat,
            stage,
        )
    if f_south_right_len > 0.001:
        add_box(
            "Wall_Foyer_South_Right",
            (door_right_x + f_south_right_len / 2, by(f_south_z), H / 2),
            (f_south_right_len, T, H),
            wall_mat,
            stage,
        )
    if door_lintel_h > 0.001:
        add_box(
            "Wall_Foyer_South_Lintel",
            (f_cx, by(f_south_z), H - door_lintel_h / 2),
            (DOOR_W, T, door_lintel_h),
            wall_mat,
            stage,
        )
    add_box(
        "Marker_Door",
        (f_cx, by(f_south_z), DOOR_H / 2),
        (DOOR_W, T * 0.4, DOOR_H),
        door_mat,
        markers,
    )

    add_label("NORTH (window)", (0, by(half_d - 0.6), 0.02), markers, size=0.4)
    add_label("SOUTH (door)", (f_cx, by(f_south_z + 0.55), 0.02), markers, size=0.35)
    add_label("EAST", (half_w - 0.5, by(0), 0.02), markers, size=0.35)
    add_label("WEST", (-half_w + 0.5, by(0), 0.02), markers, size=0.35)


# ---------------------------------------------------------------------
# Import bed and position at R3F coords
# ---------------------------------------------------------------------
def import_bed():
    if not os.path.exists(BED_GLB):
        print(f"[scene] Bed GLB missing at: {BED_GLB} - skipping bed import.")
        return

    props = get_or_make_collection("Props")

    existing = set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=BED_GLB)
    new_objs = [o for o in bpy.data.objects if o.name not in existing]
    roots = [o for o in new_objs if o.parent is None]

    bx = BED_R3F_X
    bby = by(BED_R3F_Z)
    bz = BED_R3F_Y

    for root in roots:
        root.location.x += bx
        root.location.y += bby
        root.location.z += bz
        root.rotation_euler.z += radians(BED_ROT_Y_DEG)

    for obj in new_objs:
        move_to_collection(obj, props)


# ---------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------
def main():
    clear_existing(["Room_Stage", "Markers", "Props"])
    build_room()
    import_bed()

    for area in bpy.context.screen.areas:
        if area.type == "VIEW_3D":
            for region in area.regions:
                if region.type == "WINDOW":
                    try:
                        with bpy.context.temp_override(area=area, region=region):
                            bpy.ops.view3d.view_axis(type="TOP")
                            bpy.ops.view3d.view_all()
                    except Exception:
                        pass
                    break

    os.makedirs(os.path.dirname(OUTPUT_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUTPUT_BLEND)
    print(f"[scene] Built and saved to: {OUTPUT_BLEND}")


main()
