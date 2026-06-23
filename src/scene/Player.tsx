import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { useRef } from "react";
import { Box3, Object3D, Vector3 } from "three";
import { R } from "./Room";
import { useCollide } from "../state/collide";
import { useTV } from "../state/tv";
import { useIntro } from "../state/intro";
import { useBook } from "../state/book";
import { useMonitor } from "../state/monitor";
import { symspyLocked, useSymspy } from "../state/symspy";
import { useNoclip } from "../state/noclip";
import { useWalk } from "../state/walk";

type WalkMode = "idle" | "walk" | "sprint";

const SPEED = 2.4;
const SPRINT = 4.5;
const EYE_HEIGHT = 1.65;
const PAD = 0.35;

const fwd = new Vector3();
const right = new Vector3();
const up = new Vector3(0, 1, 0);
const dir = new Vector3();
const scratchBox = new Box3();

const halfW = R.W / 2;
const halfD = R.D / 2;
const fEastX = halfW;
const fWestX = halfW - R.foyerW;
const fSouthZ = -halfD - R.foyerD;

function inside(x: number, z: number): boolean {
  const inMain =
    x >= -halfW + PAD &&
    x <= halfW - PAD &&
    z >= -halfD &&
    z <= halfD - PAD;
  const inFoyer =
    x >= fWestX + PAD &&
    x <= fEastX - PAD &&
    z >= fSouthZ + PAD &&
    z <= -halfD;
  return inMain || inFoyer;
}

function blockedBy(
  x: number,
  z: number,
  solids: Box3[],
  dynamicSolids: Object3D[],
): boolean {
  for (const b of solids) {
    if (
      x + PAD > b.min.x &&
      x - PAD < b.max.x &&
      z + PAD > b.min.z &&
      z - PAD < b.max.z
    ) {
      return true;
    }
  }
  for (const obj of dynamicSolids) {
    scratchBox.setFromObject(obj);
    if (
      x + PAD > scratchBox.min.x &&
      x - PAD < scratchBox.max.x &&
      z + PAD > scratchBox.min.z &&
      z - PAD < scratchBox.max.z
    ) {
      return true;
    }
  }
  return false;
}

type Keys = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  up: boolean;
  down: boolean;
};

export function Player() {
  const camera = useThree((s) => s.camera);
  const [, getKeys] = useKeyboardControls<keyof Keys>();
  const lastWalkRef = useRef<WalkMode>("idle");

  useFrame((_, dt) => {
    const xBefore = camera.position.x;
    const zBefore = camera.position.z;
    let walkMode: WalkMode = "idle";

    const pushWalk = () => {
      if (lastWalkRef.current === walkMode) return;
      lastWalkRef.current = walkMode;
      useWalk.getState().set(walkMode);
    };

    try {
      if (!document.pointerLockElement) return;
      const noclip = useNoclip.getState();
      if (!noclip.on) {
        if (useTV.getState().mode !== "off") return;
        if (useIntro.getState().playing) return;
        if (useBook.getState().open) return;
        if (useMonitor.getState().open) return;
        if (symspyLocked(useSymspy.getState().phase)) return;
      }
      const k = getKeys() as Keys;

      if (noclip.on) {
        const speed = (k.sprint ? noclip.speed * 2 : noclip.speed) * dt;
        camera.getWorldDirection(fwd);
        if (fwd.lengthSq() === 0) return;
        fwd.normalize();
        right.crossVectors(fwd, up).normalize();
        dir.set(0, 0, 0);
        if (k.forward) dir.add(fwd);
        if (k.back) dir.sub(fwd);
        if (k.right) dir.add(right);
        if (k.left) dir.sub(right);
        if (k.up) dir.y += 1;
        if (k.down) dir.y -= 1;
        if (dir.lengthSq() === 0) return;
        dir.normalize().multiplyScalar(speed);
        camera.position.x += dir.x;
        camera.position.y += dir.y;
        camera.position.z += dir.z;
        return;
      }

      camera.position.y = EYE_HEIGHT;

      if (!k.forward && !k.back && !k.left && !k.right) return;

      const speed = (k.sprint ? SPRINT : SPEED) * dt;

      camera.getWorldDirection(fwd);
      fwd.y = 0;
      if (fwd.lengthSq() === 0) return;
      fwd.normalize();
      right.crossVectors(fwd, up).normalize();

      dir.set(0, 0, 0);
      if (k.forward) dir.add(fwd);
      if (k.back) dir.sub(fwd);
      if (k.right) dir.add(right);
      if (k.left) dir.sub(right);

      if (dir.lengthSq() === 0) return;
      dir.normalize().multiplyScalar(speed);

      const newX = camera.position.x + dir.x;
      const newZ = camera.position.z + dir.z;
      const { solids, dynamicSolids } = useCollide.getState();

      if (
        inside(newX, camera.position.z) &&
        !blockedBy(newX, camera.position.z, solids, dynamicSolids)
      ) {
        camera.position.x = newX;
      }
      if (
        inside(camera.position.x, newZ) &&
        !blockedBy(camera.position.x, newZ, solids, dynamicSolids)
      ) {
        camera.position.z = newZ;
      }

      const dx = camera.position.x - xBefore;
      const dz = camera.position.z - zBefore;
      if (dx * dx + dz * dz > 1e-6) {
        walkMode = k.sprint ? "sprint" : "walk";
      }
    } finally {
      pushWalk();
    }
  });

  return null;
}
