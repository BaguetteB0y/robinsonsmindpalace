"""
R3F Room Stage Builder for Blender
====================================

Run this in Blender's Scripting tab to build a reference stage that
matches the R3F room exactly (5.5x8m main + 2x2m foyer, 2.7m ceiling).

Workflow:
  1. Open Blender, switch to the "Scripting" workspace.
  2. Open this file (Text Editor -> Open) or paste the contents.
  3. Click "Run Script".
  4. Switch to the "Layout" workspace.
  5. File -> Import -> glTF 2.0 -> pick your prop GLB.
  6. Position the prop with G (grab), R (rotate), S (scale).
  7. Select prop, Ctrl+A -> All Transforms (bakes position into geometry).
  8. File -> Export -> glTF 2.0 with "Selected Objects" checked.
  9. Save back into the project's public/models/ folder.

Re-running the script only rebuilds the stage; any imported props are
preserved.

Axis convention (important):
  Blender exports glTF such that Blender +Y -> glTF -Z. R3F's room has
  +Z = north (the window). To make Blender geometry export at the right
  R3F position, this script places north at Blender -Y. The labeled
  text markers ('NORTH / SOUTH / EAST / WEST') tell you which way is
  which - look at those, not at Blender's grid orientation.
"""

import bpy
from math import radians

# ---------------------------------------------------------------------
# Room config - keep in sync with src/scene/Room.tsx (the R object)
# ---------------------------------------------------------------------
W = 5.5         # main room width (X)
D = 8.0         # main room depth (Z in R3F, -Y in Blender)
H = 2.7         # ceiling height (Z in Blender)
T = 0.15        # wall thickness
FW = 2.0        # foyer width
FD = 2.0        # foyer depth
WIN_SILL = 0.8
WIN_W = 1.5
DOOR_W = 0.95
DOOR_H = 2.05


def by(three_z: float) -> float:
    """Convert R3F Z (north = +Z) to Blender Y (north = -Y)."""
    return -three_z


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------
def clear_existing_stage():
    for coll_name in ("Room_Stage", "Markers"):
        coll = bpy.data.collections.get(coll_name)
        if not coll:
            continue
        for obj in list(coll.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(coll)


def make_collection(name: str) -> bpy.types.Collection:
    coll = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(coll)
    return coll


def make_material(name: str, rgb, alpha: float = 1.0):
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
# Build
# ---------------------------------------------------------------------
def build():
    clear_existing_stage()

    stage = make_collection("Room_Stage")
    markers = make_collection("Markers")

    wall_mat = make_material("Stage_Wall", (0.85, 0.78, 0.69))
    floor_mat = make_material("Stage_Floor", (0.45, 0.30, 0.20))
    win_mat = make_material("Stage_Window", (1.0, 0.7, 0.45), alpha=0.5)
    door_mat = make_material("Stage_Door", (0.4, 0.3, 0.2), alpha=0.5)

    half_w = W / 2
    half_d = D / 2

    # Foyer geometry (in R3F coords; foyer attaches SE)
    f_east_x = half_w
    f_west_x = half_w - FW
    f_cx = (f_east_x + f_west_x) / 2
    f_north_z = -half_d              # foyer's north edge (= main's south edge)
    f_south_z = -half_d - FD
    f_center_z = (f_north_z + f_south_z) / 2

    # Floors
    add_box(
        "Floor_Main",
        location=(0, by(0), -0.025),
        size=(W, D, 0.05),
        material=floor_mat,
        collection=stage,
    )
    add_box(
        "Floor_Foyer",
        location=(f_cx, by(f_center_z), -0.025),
        size=(FW, FD, 0.05),
        material=floor_mat,
        collection=stage,
    )

    # North wall of main, split around window cutout (window flush with NE corner)
    n_z = half_d
    win_left_x = half_w - WIN_W
    win_right_x = half_w
    win_cx = (win_left_x + win_right_x) / 2
    left_len = win_left_x - (-half_w)
    lintel_h = H - (WIN_SILL + (H - WIN_SILL))  # = 0 because window goes to ceiling

    add_box(
        "Wall_North_Left",
        location=(-half_w + left_len / 2, by(n_z), H / 2),
        size=(left_len, T, H),
        material=wall_mat,
        collection=stage,
    )
    add_box(
        "Wall_North_Sill",
        location=(win_cx, by(n_z), WIN_SILL / 2),
        size=(WIN_W, T, WIN_SILL),
        material=wall_mat,
        collection=stage,
    )
    if lintel_h > 0.001:
        add_box(
            "Wall_North_Lintel",
            location=(win_cx, by(n_z), H - lintel_h / 2),
            size=(WIN_W, T, lintel_h),
            material=wall_mat,
            collection=stage,
        )
    add_box(
        "Marker_Window",
        location=(win_cx, by(n_z), WIN_SILL + (H - WIN_SILL) / 2),
        size=(WIN_W, T * 0.4, H - WIN_SILL),
        material=win_mat,
        collection=markers,
    )

    # East wall (continuous: covers main + foyer)
    e_north = half_d
    e_south = -half_d - FD
    e_len = e_north - e_south
    e_center = (e_north + e_south) / 2
    add_box(
        "Wall_East",
        location=(half_w, by(e_center), H / 2),
        size=(T, e_len, H),
        material=wall_mat,
        collection=stage,
    )

    # West wall (main only)
    add_box(
        "Wall_West",
        location=(-half_w, by(0), H / 2),
        size=(T, D, H),
        material=wall_mat,
        collection=stage,
    )

    # South wall of main, west of foyer
    s_main_west_len = f_west_x - (-half_w)
    add_box(
        "Wall_South_Main",
        location=(-half_w + s_main_west_len / 2, by(-half_d), H / 2),
        size=(s_main_west_len, T, H),
        material=wall_mat,
        collection=stage,
    )

    # West wall of foyer
    add_box(
        "Wall_Foyer_West",
        location=(f_west_x, by(f_center_z), H / 2),
        size=(T, FD, H),
        material=wall_mat,
        collection=stage,
    )

    # South wall of foyer, split around door cutout
    door_left_x = f_cx - DOOR_W / 2
    door_right_x = f_cx + DOOR_W / 2
    f_south_left_len = door_left_x - f_west_x
    f_south_right_len = f_east_x - door_right_x
    door_lintel_h = H - DOOR_H

    if f_south_left_len > 0.001:
        add_box(
            "Wall_Foyer_South_Left",
            location=(f_west_x + f_south_left_len / 2, by(f_south_z), H / 2),
            size=(f_south_left_len, T, H),
            material=wall_mat,
            collection=stage,
        )
    if f_south_right_len > 0.001:
        add_box(
            "Wall_Foyer_South_Right",
            location=(door_right_x + f_south_right_len / 2, by(f_south_z), H / 2),
            size=(f_south_right_len, T, H),
            material=wall_mat,
            collection=stage,
        )
    if door_lintel_h > 0.001:
        add_box(
            "Wall_Foyer_South_Lintel",
            location=(f_cx, by(f_south_z), H - door_lintel_h / 2),
            size=(DOOR_W, T, door_lintel_h),
            material=wall_mat,
            collection=stage,
        )
    add_box(
        "Marker_Door",
        location=(f_cx, by(f_south_z), DOOR_H / 2),
        size=(DOOR_W, T * 0.4, DOOR_H),
        material=door_mat,
        collection=markers,
    )

    # Floor-plan compass labels (lay flat on the floor)
    add_label("NORTH (window)", (0, by(half_d - 0.6), 0.02), markers, size=0.4)
    add_label("SOUTH (door)", (f_cx, by(f_south_z + 0.55), 0.02), markers, size=0.35)
    add_label("EAST", (half_w - 0.5, by(0), 0.02), markers, size=0.35)
    add_label("WEST", (-half_w + 0.5, by(0), 0.02), markers, size=0.35)

    # Set viewport to top view in any 3D viewport, frame the scene
    for area in bpy.context.screen.areas:
        if area.type == "VIEW_3D":
            for region in area.regions:
                if region.type == "WINDOW":
                    override = {"area": area, "region": region}
                    try:
                        with bpy.context.temp_override(**override):
                            bpy.ops.view3d.view_axis(type="TOP")
                            bpy.ops.view3d.view_all()
                    except Exception:
                        pass
                    break

    print(
        f"[stage] Built: main {W}x{D}x{H}m + foyer {FW}x{FD}m. "
        f"Window {WIN_W}m wide in NE corner, sill {WIN_SILL}m. "
        f"Door {DOOR_W}x{DOOR_H}m on foyer south wall."
    )


build()
