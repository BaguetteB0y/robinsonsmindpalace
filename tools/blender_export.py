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


def main():
    count = select_collection_objects(SOURCE_COLLECTION)
    if count == 0:
        print(
            f"[export] No objects found in '{SOURCE_COLLECTION}' collection. "
            f"Drop your props into the '{SOURCE_COLLECTION}' collection in the "
            f"Outliner, then run again."
        )
        return

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
        export_force_sampling=True,
    )
    print(f"[export] Wrote {count} object(s) from '{SOURCE_COLLECTION}' to: {OUTPUT_GLB}")


main()
