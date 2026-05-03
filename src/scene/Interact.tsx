import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Object3D, Raycaster, Vector3 } from "three";
import { useInteract } from "../state/interact";

const MAX_DIST = 3;

function clickAncestorName(o: Object3D): string | null {
  let cur: Object3D | null = o;
  while (cur) {
    if (cur.name.toLowerCase().includes("click")) return cur.name;
    cur = cur.parent;
  }
  return o.name || null;
}

export function Interact() {
  const { camera } = useThree();
  const meshes = useInteract((s) => s.meshes);
  const setTarget = useInteract((s) => s.setTarget);
  const raycaster = useRef(new Raycaster());
  const dir = useRef(new Vector3());
  const targetRef = useRef<string | null>(null);

  useFrame(() => {
    if (meshes.length === 0) {
      if (targetRef.current !== null) {
        targetRef.current = null;
        setTarget(null);
      }
      return;
    }
    camera.getWorldDirection(dir.current);
    raycaster.current.set(camera.position, dir.current);
    raycaster.current.far = MAX_DIST;
    const hits = raycaster.current.intersectObjects(meshes, false);
    const next = hits.length > 0 ? clickAncestorName(hits[0].object) : null;
    if (next !== targetRef.current) {
      targetRef.current = next;
      setTarget(next);
    }
  });

  useEffect(() => {
    const fire = () => {
      const name = targetRef.current;
      if (!name) return;
      console.log("[interact]", name);
      window.dispatchEvent(
        new CustomEvent("interact", { detail: { name } }),
      );
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyE") fire();
    };
    const onMouse = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (document.pointerLockElement === null) return;
      fire();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onMouse);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onMouse);
    };
  }, []);

  return null;
}
