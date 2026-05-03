"""
add_intro_cam.py
================
Creates the IntroCam "waking up" animation for the Oneiric scene.

Run this from inside Blender (open Oneiric.blend, then in the Scripting workspace
open and Run this file). Or from the command line:

    blender Oneiric.blend --python add_intro_cam.py --save

What it does (all six steps from the instructions, automated):
  1. Adds an Empty named "IntroCam" (Plain Axes).
  2. Links it into the "Props" collection (and unlinks from any other collection
     it ended up in) so the export script picks it up.
  3. Reads Cube.002's world bounding box and computes a start pose ABOVE its
     top face, head tilted down (~ -25° around X). End pose: same XY moved
     slightly forward in -Y, raised in Z, head leveled to 0°. (Adjust the
     OFFSETS block below if your scene's "forward" is +Y instead of -Y, or
     if you want a different framing — see the comments.)
  4. Inserts Location + Rotation keyframes at frame 1 and frame 84.
  5. Sets all f-curve handles to AUTO_CLAMPED with Bezier interpolation so the
     motion eases out smoothly without overshoot.
  6. Names the action "IntroCamAction" and gives it a fake user (the shield)
     so it's saved with the file even if nothing references it later.

Run safely twice: it removes any existing IntroCam / IntroCamAction first.
"""

import bpy
from math import radians
from mathutils import Vector

# ---------------------------------------------------------------------------
# Tunables — change these if the framing isn't quite right.
# ---------------------------------------------------------------------------

CUBE_NAME           = "Cube.002"
EMPTY_NAME          = "IntroCam"
ACTION_NAME         = "IntroCamAction"
TARGET_COLLECTION   = "Props"

START_FRAME         = 1
END_FRAME           = 84   # 3.5 s at 24 fps

# Start pose (frame 1): sitting up just above the top of Cube.002, head tilted
# down a touch (eyes-just-opening pose).
START_HEIGHT_ABOVE_TOP = 0.05   # metres above the cube's top face
START_FORWARD_OFFSET   = 0.00   # 0 = directly above the cube's centre on XY
START_PITCH_DEG        = -25.0  # negative = looking down (Blender X-rot)
START_YAW_DEG          = 0.0    # rotate around Z if you need to face a direction
START_ROLL_DEG         = 0.0

# End pose (frame 84): head raised, leaned slightly forward, looking level.
END_RISE               = 0.35   # metres higher than start
END_FORWARD            = 0.40   # metres "forward" — see FORWARD_AXIS below
END_PITCH_DEG          = 0.0    # 0 = looking level (forward)
END_YAW_DEG            = 0.0
END_ROLL_DEG           = 0.0

# Which axis is "forward" in your scene? Blender's default camera convention
# has it looking down -Z, but for an empty we treat the rest pose as looking
# down -Y (the room's forward direction in most interior scenes). Flip the
# sign here if your room faces +Y instead.
FORWARD_AXIS = Vector((0.0, -1.0, 0.0))


# ---------------------------------------------------------------------------
# Implementation
# ---------------------------------------------------------------------------

def get_world_top_center(obj: bpy.types.Object) -> Vector:
    """Return the world-space point at the centre of the object's top face
    (highest Z of its world-space bounding box, centred on XY)."""
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    xs = [v.x for v in corners]
    ys = [v.y for v in corners]
    zs = [v.z for v in corners]
    return Vector(((min(xs) + max(xs)) * 0.5,
                   (min(ys) + max(ys)) * 0.5,
                   max(zs)))


def ensure_collection(name: str) -> bpy.types.Collection:
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
        print(f"[IntroCam] Created missing collection '{name}'.")
    return col


def remove_if_exists(name: str):
    obj = bpy.data.objects.get(name)
    if obj is not None:
        # Unlink from every collection then delete
        for col in list(obj.users_collection):
            col.objects.unlink(obj)
        bpy.data.objects.remove(obj, do_unlink=True)
        print(f"[IntroCam] Removed existing object '{name}'.")
    act = bpy.data.actions.get(ACTION_NAME)
    if act is not None and act.users == 0:
        bpy.data.actions.remove(act)
        print(f"[IntroCam] Removed orphaned action '{ACTION_NAME}'.")


def insert_loc_rot_keyframe(obj: bpy.types.Object, frame: int):
    obj.keyframe_insert(data_path="location",       frame=frame)
    obj.keyframe_insert(data_path="rotation_euler", frame=frame)


def smooth_action(action: bpy.types.Action):
    """Bezier interpolation, AUTO_CLAMPED handles — gives a clean ease without
    overshoot. Matches the 'easeOut-ish' feel called out in the instructions."""
    for fcurve in action.fcurves:
        for kp in fcurve.keyframe_points:
            kp.interpolation  = 'BEZIER'
            kp.handle_left_type  = 'AUTO_CLAMPED'
            kp.handle_right_type = 'AUTO_CLAMPED'
        fcurve.update()


def main():
    scene = bpy.context.scene

    # Sanity check the scene we're operating on.
    cube = bpy.data.objects.get(CUBE_NAME)
    if cube is None:
        raise RuntimeError(
            f"Could not find object '{CUBE_NAME}'. "
            f"Open the .blend that has it, or change CUBE_NAME at the top of this script."
        )

    # Make sure 24 fps so 84 frames = 3.5 s as stated in the instructions.
    if scene.render.fps != 24:
        print(f"[IntroCam] Note: scene FPS is {scene.render.fps}, "
              f"not 24 — 84 frames will not be exactly 3.5 s.")

    # 1 + 2. Add the empty and put it in Props.
    remove_if_exists(EMPTY_NAME)
    props = ensure_collection(TARGET_COLLECTION)
    empty = bpy.data.objects.new(EMPTY_NAME, None)        # None data => Empty
    empty.empty_display_type = 'PLAIN_AXES'
    empty.empty_display_size = 0.3
    props.objects.link(empty)
    print(f"[IntroCam] Created '{EMPTY_NAME}' in collection '{TARGET_COLLECTION}'.")

    # 3. Compute and apply the start pose.
    top = get_world_top_center(cube)
    forward = FORWARD_AXIS.normalized()

    start_loc = top + Vector((0.0, 0.0, START_HEIGHT_ABOVE_TOP)) \
                    + forward * START_FORWARD_OFFSET
    end_loc   = start_loc + Vector((0.0, 0.0, END_RISE)) \
                          + forward * END_FORWARD

    empty.rotation_mode = 'XYZ'

    scene.frame_set(START_FRAME)
    empty.location = start_loc
    empty.rotation_euler = (radians(START_PITCH_DEG),
                            radians(START_ROLL_DEG),
                            radians(START_YAW_DEG))
    insert_loc_rot_keyframe(empty, START_FRAME)
    print(f"[IntroCam] Start  @ frame {START_FRAME}: "
          f"loc={tuple(round(c,3) for c in start_loc)}  pitch={START_PITCH_DEG}°")

    # 3b. Apply the end pose.
    scene.frame_set(END_FRAME)
    empty.location = end_loc
    empty.rotation_euler = (radians(END_PITCH_DEG),
                            radians(END_ROLL_DEG),
                            radians(END_YAW_DEG))
    insert_loc_rot_keyframe(empty, END_FRAME)
    print(f"[IntroCam] End    @ frame {END_FRAME}: "
          f"loc={tuple(round(c,3) for c in end_loc)}  pitch={END_PITCH_DEG}°")

    # 4. Smooth handles for an ease-out feel.
    action = empty.animation_data.action
    if action is None:
        raise RuntimeError("No action created on IntroCam — keyframe insertion failed.")
    smooth_action(action)
    print(f"[IntroCam] Smoothed {len(action.fcurves)} f-curves "
          f"(Bezier + AUTO_CLAMPED handles).")

    # 5. Name the action and pin it (fake user / shield).
    action.name = ACTION_NAME
    action.use_fake_user = True
    print(f"[IntroCam] Action named '{ACTION_NAME}', fake user set "
          f"(shield is on — survives save with no users).")

    # Reset playhead so the user sees frame 1 when they look at the viewport.
    scene.frame_set(START_FRAME)
    print("[IntroCam] Done.  Now run tools/blender_export.py to produce scene.glb.")


if __name__ == "__main__":
    main()
