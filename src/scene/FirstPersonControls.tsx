import { useThree } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle } from "react";
import { Euler } from "three";
import { useIntro } from "../state/intro";

const PI_2 = Math.PI / 2;
const MAX_DELTA = 80;

type Props = {
  sensitivity?: number;
  onLock?: () => void;
  onUnlock?: () => void;
};

export type FPCHandle = {
  lock: () => void;
  unlock: () => void;
};

export const FirstPersonControls = forwardRef<FPCHandle, Props>(
  function FirstPersonControls(
    { sensitivity = 0.0015, onLock, onUnlock },
    ref
  ) {
    const camera = useThree((s) => s.camera);
    const gl = useThree((s) => s.gl);

    useImperativeHandle(
      ref,
      () => ({
        lock: () => {
          const el = gl.domElement as HTMLCanvasElement & {
            requestPointerLock: (opts?: {
              unadjustedMovement?: boolean;
            }) => Promise<void> | void;
          };
          const p = el.requestPointerLock({ unadjustedMovement: true });
          if (p && typeof p.catch === "function") {
            p.catch(() => el.requestPointerLock());
          }
        },
        unlock: () => document.exitPointerLock(),
      }),
      [gl]
    );

    useEffect(() => {
      const el = gl.domElement;
      const euler = new Euler(0, 0, 0, "YXZ");

      const onMove = (e: MouseEvent) => {
        if (document.pointerLockElement !== el) return;
        if (useIntro.getState().playing) return;

        const dx = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, e.movementX));
        const dy = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, e.movementY));

        euler.setFromQuaternion(camera.quaternion);
        euler.y -= dx * sensitivity;
        euler.x -= dy * sensitivity;
        euler.x = Math.max(-PI_2 + 0.01, Math.min(PI_2 - 0.01, euler.x));
        camera.quaternion.setFromEuler(euler);
      };

      const onChange = () => {
        if (document.pointerLockElement === el) {
          onLock?.();
        } else {
          onUnlock?.();
        }
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("pointerlockchange", onChange);
      return () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("pointerlockchange", onChange);
      };
    }, [camera, gl, sensitivity, onLock, onUnlock]);

    return null;
  }
);
