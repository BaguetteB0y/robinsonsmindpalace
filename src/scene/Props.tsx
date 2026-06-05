import { Clone, useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import {
  AnimationAction,
  Box3,
  Group,
  LoopOnce,
  LoopRepeat,
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

const SYMSPY_TURN_ACTION_NAMES = ["HeadAction.002"];
const SYMSPY_WALK_ACTION_NAMES = ["HeadAction"];
const SYMSPY_LEAVE_ACTION_NAMES = ["WalkSwing_LookAround", "Figure click solidAction"];
const SYMSPY_LOOP_TWICE_NAMES = ["WalkSwing_LookAround"];
const SYMSPY_GATED_NAMES = [
  ...SYMSPY_TURN_ACTION_NAMES,
  ...SYMSPY_WALK_ACTION_NAMES,
  ...SYMSPY_LEAVE_ACTION_NAMES,
];
const SYMSPY_TARGET_PREFIX = "Figure_click_solid";
const matchSymspyName = (clipName: string, candidates: string[]) =>
  candidates.includes(clipName);
// Covers the dot-reveal animation in SymspyDialogue (3 dots × 300 ms) plus a
// small grace, so clicks during reveal can't skip to the next set.
const SYMSPY_CLICK_FLOOR_MS = 700;
// Blender authored the leave clips with a frame-0 pose that doesn't match
// HeadAction's clamped end pose, so without a blend the head snaps when leave
// starts. Crossfade smooths the discontinuity.
const SYMSPY_LEAVE_CROSSFADE_S = 0.155;

const URL = "/models/scene.glb";

useGLTF.preload(URL);

const isGlow = (name: string) => name.toLowerCase().includes("glow");
const isClick = (name: string) => name.toLowerCase().includes("click");
const isSolid = (name: string) => name.toLowerCase().includes("solid");
const isDynamicSolid = (name: string) =>
  name.toLowerCase().startsWith(SYMSPY_TARGET_PREFIX.toLowerCase());
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
      if (matchSymspyName(name, SYMSPY_GATED_NAMES)) continue;
      action.reset().play();
    }
  }, [actions]);

  useEffect(() => {
    const turnActions: AnimationAction[] = [];
    const walkActions: AnimationAction[] = [];
    const leaveActions: AnimationAction[] = [];
    const loopTwiceActions: AnimationAction[] = [];
    for (const [name, action] of Object.entries(actions)) {
      if (!action) continue;
      // Same clip can land in multiple buckets so we can replay HeadAction on
      // both first-click (turn) and the third dot set (walk).
      if (matchSymspyName(name, SYMSPY_TURN_ACTION_NAMES)) turnActions.push(action);
      if (matchSymspyName(name, SYMSPY_WALK_ACTION_NAMES)) walkActions.push(action);
      if (matchSymspyName(name, SYMSPY_LEAVE_ACTION_NAMES)) leaveActions.push(action);
      if (matchSymspyName(name, SYMSPY_LOOP_TWICE_NAMES)) loopTwiceActions.push(action);
    }
    console.log(
      "[symspy] turn=", turnActions.length,
      "walk=", walkActions.length,
      "leave=", leaveActions.length,
      "keys=", Object.keys(actions),
    );

    const allGated = Array.from(
      new Set<AnimationAction>([...turnActions, ...walkActions, ...leaveActions]),
    );
    if (allGated.length === 0) return;

    for (const a of allGated) {
      a.setLoop(LoopOnce, 1);
      a.clampWhenFinished = true;
      // Pin at frame 0 so the model sits in its starting pose (not end-of-clip)
      // until the click flow plays it.
      a.reset();
      a.play();
      a.paused = true;
    }
    // WalkSwing_LookAround loops twice during the leave phase; FigureAction
    // stays single-play. clampWhenFinished still applies after the final loop
    // so leavePending decrements correctly.
    for (const a of loopTwiceActions) {
      a.setLoop(LoopRepeat, 2);
    }
    const mixer = allGated[0].getMixer();
    mixer.update(0);

    let lastAdvance = 0;
    let leavePending = 0;

    const onFinished = (e: { action: AnimationAction }) => {
      if (leaveActions.includes(e.action)) {
        leavePending--;
        if (leavePending <= 0 && useSymspy.getState().phase === "leave") {
          useSymspy.getState().setPhase("done");
        }
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
      else useSymspy.getState().setPhase("message");
    };
    window.addEventListener("mousedown", onAdvanceClick);

    const unsubPhase = useSymspy.subscribe((s, prev) => {
      if (s.phase === prev.phase) return;
      if (s.phase === "dots-1" && prev.phase === "idle") {
        // Fire HeadAction the instant the entity is first clicked so the head
        // turn plays during the dot reveal, not after.
        for (const a of turnActions) {
          a.stop();
          a.reset();
          a.paused = false;
          a.play();
        }
      } else if (s.phase === "dots-3") {
        // Replay HeadAction on the third dot set so the head moves again
        // right before the message reveals.
        for (const a of walkActions) {
          a.stop();
          a.reset();
          a.paused = false;
          a.play();
        }
      } else if (s.phase === "leave") {
        if (leaveActions.length === 0) {
          useSymspy.getState().setPhase("done");
          return;
        }
        for (const a of turnActions) a.fadeOut(SYMSPY_LEAVE_CROSSFADE_S);
        for (const a of walkActions) a.fadeOut(SYMSPY_LEAVE_CROSSFADE_S);
        leavePending = leaveActions.length;
        for (const a of leaveActions) {
          a.reset();
          a.paused = false;
          a.play();
          a.fadeIn(SYMSPY_LEAVE_CROSSFADE_S);
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
