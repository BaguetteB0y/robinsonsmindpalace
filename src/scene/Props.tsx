import { Clone, useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import {
  AnimationAction,
  Box3,
  Group,
  LoopOnce,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from "three";
import { useInteract } from "../state/interact";
import { useCollide } from "../state/collide";
import { useIntro } from "../state/intro";
import { useSymspy } from "../state/symspy";
import { jitterOnBeforeCompile } from "./jitter";

const INTRO_CAM_NAMES = ["IntroCam", "Empty"];
const INTRO_ACTION_NAMES = ["IntroCamAction", "EmptyAction"];

const SYMSPY_ACTIONS = ["ShadowManTurn", "ShadowManLeave"];
const SYMSPY_TARGET_PREFIX = "SYMSPYMOM_160";
const CLICK_GATED_ACTION_NAMES = new Set(SYMSPY_ACTIONS);
// Covers the dot-reveal animation in SymspyDialogue (3 dots × 300 ms) plus a
// small grace, so clicks during reveal can't skip to the next set.
const SYMSPY_CLICK_FLOOR_MS = 700;

const URL = "/models/scene.glb";

useGLTF.preload(URL);

const isGlow = (name: string) => name.toLowerCase().includes("glow");
const isClick = (name: string) => name.toLowerCase().includes("click");
const isSolid = (name: string) => name.toLowerCase().includes("solid");
const isDynamicSolid = (name: string) =>
  name.toUpperCase().startsWith(SYMSPY_TARGET_PREFIX);
const DISABLED_CLICK_NAMES = new Set(["orchid_click", "ashtray_click", "siddartha_click"]);
const isDisabledClick = (name: string) => DISABLED_CLICK_NAMES.has(name.toLowerCase());
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
  const setDynamicSolids = useCollide((s) => s.setDynamicSolids);
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
    const dynamicSolids: Object3D[] = [];
    const solidRoots = new Set<Object3D>();
    let introCam: Object3D | null = null;
    root.traverse((o) => {
      if (
        o instanceof Mesh &&
        ancestorMatches(o, isClick) &&
        !ancestorMatches(o, isDisabledClick)
      )
        clickable.push(o);
      if (!introCam && INTRO_CAM_NAMES.includes(o.name)) introCam = o;
      if (!isSolid(o.name)) return;
      let p: Object3D | null = o.parent;
      while (p) {
        if (solidRoots.has(p)) return;
        p = p.parent;
      }
      solidRoots.add(o);
      if (ancestorMatches(o, isDynamicSolid)) {
        dynamicSolids.push(o);
      } else {
        solids.push(new Box3().setFromObject(o));
      }
    });
    setMeshes(clickable);
    setSolids(solids);
    setDynamicSolids(dynamicSolids);
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
      setDynamicSolids([]);
      useIntro.getState().setRefs(null, null);
    };
  }, [setMeshes, setSolids, setDynamicSolids, actions]);

  useEffect(() => {
    for (const [name, action] of Object.entries(actions)) {
      if (!action) continue;
      if (INTRO_ACTION_NAMES.includes(name)) continue;
      if (CLICK_GATED_ACTION_NAMES.has(name)) continue;
      action.reset().play();
    }
  }, [actions]);

  useEffect(() => {
    const a1 = actions[SYMSPY_ACTIONS[0]];
    const a2 = actions[SYMSPY_ACTIONS[1]];
    console.log("[symspy] a1=", !!a1, "a2=", !!a2, "looking for", SYMSPY_ACTIONS);
    if (!a1) return;

    a1.setLoop(LoopOnce, 1);
    a1.clampWhenFinished = true;
    if (a2) {
      a2.setLoop(LoopOnce, 1);
      a2.clampWhenFinished = true;
    }

    // Pin Turn at frame 0 — overrides bind pose so model sits in starting pose
    // (not end-of-Turn) until first click.
    a1.reset();
    a1.play();
    a1.paused = true;
    const mixer = a1.getMixer();
    mixer.update(0);

    let lastAdvance = 0;

    const onFinished = (e: { action: AnimationAction }) => {
      if (e.action === a1) {
        useSymspy.getState().setPhase("message");
      } else if (a2 && e.action === a2) {
        useSymspy.getState().setPhase("done");
      }
    };
    mixer.addEventListener("finished", onFinished as never);

    const onInteract = (e: Event) => {
      const detail = (e as CustomEvent<{ name: string }>).detail;
      if (!detail?.name?.startsWith(SYMSPY_TARGET_PREFIX)) return;
      if (useSymspy.getState().phase !== "idle") return;
      useSymspy.getState().setPhase("dots-1");
      lastAdvance = performance.now();
    };
    window.addEventListener("interact", onInteract);

    const onAdvanceClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const phase = useSymspy.getState().phase;
      if (phase !== "dots-1" && phase !== "dots-2" && phase !== "dots-3") {
        return;
      }
      const now = performance.now();
      if (now - lastAdvance < SYMSPY_CLICK_FLOOR_MS) return;
      lastAdvance = now;
      if (phase === "dots-1") useSymspy.getState().setPhase("dots-2");
      else if (phase === "dots-2") useSymspy.getState().setPhase("dots-3");
      else useSymspy.getState().setPhase("turn");
    };
    window.addEventListener("mousedown", onAdvanceClick);

    const unsubPhase = useSymspy.subscribe((s, prev) => {
      if (s.phase === prev.phase) return;
      if (s.phase === "turn") {
        a1.stop();
        a1.reset();
        a1.paused = false;
        a1.play();
      } else if (s.phase === "leave") {
        if (a2) {
          a1.stop();
          a2.reset().play();
        } else {
          useSymspy.getState().setPhase("done");
        }
      }
    });

    return () => {
      window.removeEventListener("interact", onInteract);
      window.removeEventListener("mousedown", onAdvanceClick);
      mixer.removeEventListener("finished", onFinished as never);
      unsubPhase();
      useSymspy.getState().setPhase("idle");
    };
  }, [actions]);

  return <Clone ref={cloneRef} object={scene} />;
}
