import { Clone, useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { Box3, Group, Mesh, MeshStandardMaterial, Object3D } from "three";
import { useInteract } from "../state/interact";
import { useCollide } from "../state/collide";
import { useIntro } from "../state/intro";
import { jitterOnBeforeCompile } from "./jitter";

const INTRO_CAM_NAMES = ["IntroCam", "Empty"];
const INTRO_ACTION_NAMES = ["IntroCamAction", "EmptyAction"];

const URL = "/models/scene.glb";

useGLTF.preload(URL);

const isGlow = (name: string) => name.toLowerCase().includes("glow");
const isClick = (name: string) => name.toLowerCase().includes("click");
const isSolid = (name: string) => name.toLowerCase().includes("solid");
const isNoShadow = (name: string) => {
  const n = name.toLowerCase();
  return n.includes("noshadow") || n.includes("sketchfab_model003");
};

const ancestorMatches = (
  o: Object3D,
  pred: (n: string) => boolean,
): boolean => {
  let cur: Object3D | null = o;
  while (cur) {
    if (pred(cur.name)) return true;
    cur = cur.parent;
  }
  return false;
};

export function Props() {
  const { scene, animations } = useGLTF(URL);
  const cloneRef = useRef<Group>(null);
  const setMeshes = useInteract((s) => s.setMeshes);
  const setSolids = useCollide((s) => s.setSolids);
  const { actions } = useAnimations(animations, cloneRef);

  useMemo(() => {
    scene.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.castShadow = !ancestorMatches(m, isNoShadow);
      m.receiveShadow = true;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const meshGlow = ancestorMatches(m, isGlow);
      for (const raw of mats) {
        const mat = raw as MeshStandardMaterial;
        mat.onBeforeCompile = jitterOnBeforeCompile;
        if (meshGlow || isGlow(mat.name)) {
          mat.needsUpdate = true;
          continue;
        }
        if (mat.emissiveMap && !mat.map) {
          mat.map = mat.emissiveMap;
          mat.emissiveMap = null;
          mat.color?.setRGB(1, 1, 1);
        }
        mat.emissive?.setRGB(0, 0, 0);
        mat.emissiveIntensity = 0;
        mat.needsUpdate = true;
      }
    });
  }, [scene]);

  useEffect(() => {
    const root = cloneRef.current;
    if (!root) return;
    const clickable: Mesh[] = [];
    const solids: Box3[] = [];
    const solidRoots = new Set<Object3D>();
    let introCam: Object3D | null = null;
    root.traverse((o) => {
      if (o instanceof Mesh && ancestorMatches(o, isClick)) clickable.push(o);
      if (!introCam && INTRO_CAM_NAMES.includes(o.name)) introCam = o;
      if (!isSolid(o.name)) return;
      let p: Object3D | null = o.parent;
      while (p) {
        if (solidRoots.has(p)) return;
        p = p.parent;
      }
      solidRoots.add(o);
      solids.push(new Box3().setFromObject(o));
    });
    setMeshes(clickable);
    setSolids(solids);
    let introAction = null;
    for (const name of INTRO_ACTION_NAMES) {
      if (actions[name]) {
        introAction = actions[name];
        break;
      }
    }
    console.log("[intro] cam=", introCam, "action=", introAction);
    console.log("[intro] action keys=", Object.keys(actions));
    useIntro.getState().setRefs(introCam, introAction);
    return () => {
      setMeshes([]);
      setSolids([]);
      useIntro.getState().setRefs(null, null);
    };
  }, [setMeshes, setSolids, actions]);

  useEffect(() => {
    for (const [name, action] of Object.entries(actions)) {
      if (!action) continue;
      if (INTRO_ACTION_NAMES.includes(name)) continue;
      action.reset().play();
    }
  }, [actions]);

  return <Clone ref={cloneRef} object={scene} />;
}
