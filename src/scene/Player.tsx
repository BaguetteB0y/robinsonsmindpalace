import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { Box3, Vector3 } from "three";
import { R } from "./Room";
import { useCollide } from "../state/collide";
import { useTV } from "../state/tv";
import { useIntro } from "../state/intro";
import { useBook } from "../state/book";

const SPEED = 2.4;
const SPRINT = 4.5;
const EYE_HEIGHT = 1.65;
const PAD = 0.35;

const fwd = new Vector3();
const right = new Vector3();
const up = new Vector3(0, 1, 0);
const dir = new Vector3();

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

function blockedBy(x: number, z: number, solids: Box3[]): boolean {
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
  return false;
}

type Keys = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
};

export function Player() {
  const camera = useThree((s) => s.camera);
  const [, getKeys] = useKeyboardControls<keyof Keys>();

  useFrame((_, dt) => {
    if (useTV.getState().mode !== "off") return;
    if (useIntro.getState().playing) return;
    if (useBook.getState().open) return;
    const k = getKeys() as Keys;

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
    const solids = useCollide.getState().solids;

    if (
      inside(newX, camera.position.z) &&
      !blockedBy(newX, camera.position.z, solids)
    ) {
      camera.position.x = newX;
    }
    if (
      inside(camera.position.x, newZ) &&
      !blockedBy(camera.position.x, newZ, solids)
    ) {
      camera.position.z = newZ;
    }
  });

  return null;
}
