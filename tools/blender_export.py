"""
Export the Props collection from Blender to public/models/scene.glb
====================================================================

The R3F room shell stays procedural in code (walls/floor/ceiling).
Everything else - bed, future sofa, table, etc. - lives in Blender's
"Props" collection and rides into R3F as one GLB.

Run this in Blender's Scripting tab whenever you've moved or added
furniture. It overwrites public/models/scene.glb with a fresh export.

Workflow:
  1. Tweak / add props in Blender (anything that should appear in R3F
     must be in the "Props" collection).
  2. Run this script.
  3. In R3F, refresh the browser. Vite picks up the changed GLB.

Adding new furniture:
  - File -> Import -> glTF 2.0 (or model in Blender directly)
  - In the Outliner, drag the new object(s) into the "Props" collection
    so this script sees them.
"""

import bpy
import os

PROJECT_ROOT = r"C:\Users\robin\Desktop\Website project"
OUTPUT_GLB = os.path.join(PROJECT_ROOT, "public", "models", "scene.glb")
SOURCE_COLLECTION = "Props"


def select_collection_objects(coll_name: str) -> int:
    bpy.ops.object.select_all(action="DESELECT")
    coll = bpy.data.collections.get(coll_name)
    if not coll:
        return 0
    objs = list(coll.all_objects)
    if not objs:
        return 0
    for obj in objs:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    print(f"[export] Selecting {len(objs)} object(s) from '{coll_name}' (incl. sub-collections):")
    for obj in objs:
        print(f"  - {obj.name} ({obj.type})")
    return len(objs)


def _iter_action_fcurves(action):
    """Yield every FCurve in an Action, handling both legacy (<4.4) and
    layered (4.4+) Action data structures."""
    # Legacy: Action.fcurves is a flat collection
    fcurves = getattr(action, "fcurves", None)
    if fcurves is not None:
        for fc in fcurves:
            yield fc
        return
    # 4.4+: Action.layers[].strips[].channelbags[].fcurves
    layers = getattr(action, "layers", None)
    if layers is None:
        return
    for layer in layers:
        for strip in getattr(layer, "strips", []):
            channelbags = getattr(strip, "channelbags", None)
            if channelbags is not None:
                for cb in channelbags:
                    for fc in getattr(cb, "fcurves", []):
                        yield fc
                continue
            # Some 4.4 builds exposed `channels` directly on the strip
            for fc in getattr(strip, "channels", []):
                yield fc


def action_keyframe_range(action):
    """First/last actual keyframe across every fcurve in this Action.
    Returns (first, last) as floats, or None if the action has no keyframes."""
    if not action:
        return None
    first = float("inf")
    last = float("-inf")
    for fc in _iter_action_fcurves(action):
        for kp in fc.keyframe_points:
            f = kp.co.x
            if f < first:
                first = f
            if f > last:
                last = f
    if first == float("inf"):
        return None
    return (first, last)


def report_animations(coll_name: str):
    coll = bpy.data.collections.get(coll_name)
    if not coll:
        return
    print(f"[export] Animation report for '{coll_name}':")
    for obj in coll.all_objects:
        ad = obj.animation_data
        if not ad:
            continue
        active = ad.action.name if ad.action else "(none)"
        if active != "(none)":
            print(f"  {obj.name}: active={active}")
        for track in ad.nla_tracks:
            for strip in track.strips:
                act = strip.action
                if not act:
                    print(f"    [track '{track.name}'] strip '{strip.name}' -> (no action)")
                    continue
                muted = " MUTED" if strip.mute else ""
                kf = action_keyframe_range(act)
                kf_txt = f"keyframes {kf[0]:.0f}->{kf[1]:.0f}" if kf else "no keyframes"
                print(
                    f"    [track '{track.name}'] strip '{strip.name}'{muted} -> "
                    f"action '{act.name}' ({kf_txt})"
                )
                print(
                    f"      strip timeline: {strip.frame_start:.0f}->{strip.frame_end:.0f}  "
                    f"strip action range: {strip.action_frame_start:.0f}->{strip.action_frame_end:.0f}"
                )
                if kf:
                    lead = strip.action_frame_start - kf[0]
                    trail = strip.action_frame_end - kf[1]
                    if lead < 0:
                        print(f"      ! {-lead:.0f}-frame IDLE PAD at clip START (strip samples before first keyframe)")
                    elif lead > 0:
                        print(f"      ! skipping first {lead:.0f} frames of action")
                    if trail > 0:
                        print(f"      ! {trail:.0f}-frame IDLE PAD at clip END (strip extends past last keyframe)")
                    elif trail < 0:
                        print(f"      ! truncating action by {-trail:.0f} frames at end")
    print(f"[export] All Actions in file:")
    for act in bpy.data.actions:
        print(f"  - {act.name} (users={act.users}, use_fake_user={act.use_fake_user})")


def auto_trim_strips(coll_name: str):
    """Snap every NLA strip's action range and timeline position to the
    Action's actual keyframe range. Eliminates lead/trail idle padding so
    the exported clip duration == the real motion duration."""
    coll = bpy.data.collections.get(coll_name)
    if not coll:
        return
    print(f"[export] Auto-trimming NLA strips to keyframe range:")
    for obj in coll.all_objects:
        ad = obj.animation_data
        if not ad:
            continue
        for track in ad.nla_tracks:
            for strip in track.strips:
                act = strip.action
                if not act:
                    continue
                kf = action_keyframe_range(act)
                if not kf:
                    continue
                kf_first, kf_last = kf
                motion_len = kf_last - kf_first
                if motion_len <= 0:
                    continue
                before = (
                    strip.frame_start,
                    strip.frame_end,
                    strip.action_frame_start,
                    strip.action_frame_end,
                )
                # Order matters: widen extents first so we don't clamp ourselves.
                strip.action_frame_end = max(strip.action_frame_end, kf_last)
                strip.action_frame_start = kf_first
                strip.action_frame_end = kf_last
                strip.frame_end = strip.frame_start + motion_len
                if (
                    strip.frame_start != before[0]
                    or strip.frame_end != before[1]
                    or strip.action_frame_start != before[2]
                    or strip.action_frame_end != before[3]
                ):
                    print(
                        f"  {obj.name} / {strip.name}: "
                        f"timeline {before[0]:.0f}->{before[1]:.0f} => {strip.frame_start:.0f}->{strip.frame_end:.0f}, "
                        f"action range {before[2]:.0f}->{before[3]:.0f} => {strip.action_frame_start:.0f}->{strip.action_frame_end:.0f}"
                    )
                else:
                    print(f"  {obj.name} / {strip.name}: already tight, no change")


def main():
    count = select_collection_objects(SOURCE_COLLECTION)
    if count == 0:
        print(
            f"[export] No objects found in '{SOURCE_COLLECTION}' collection. "
            f"Drop your props into the '{SOURCE_COLLECTION}' collection in the "
            f"Outliner, then run again."
        )
        return

    print("[export] --- BEFORE auto-trim ---")
    report_animations(SOURCE_COLLECTION)
    auto_trim_strips(SOURCE_COLLECTION)
    print("[export] --- AFTER auto-trim ---")
    report_animations(SOURCE_COLLECTION)

    os.makedirs(os.path.dirname(OUTPUT_GLB), exist_ok=True)

    bpy.ops.export_scene.gltf(
        filepath=OUTPUT_GLB,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_extras=False,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
    )
    print(f"[export] Wrote {count} object(s) from '{SOURCE_COLLECTION}' to: {OUTPUT_GLB}")


main()
