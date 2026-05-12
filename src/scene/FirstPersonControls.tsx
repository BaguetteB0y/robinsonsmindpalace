import { useFrame, useThree } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Euler } from "three";
import { useIntro } from "../state/intro";

const PI_2 = Math.PI / 2;
const MAX_DELTA_PER_EVENT = 250;
const MAX_ROTATION_PER_FRAME = 0.5;

type Props = {
  sensitivity?: number;
  onLock?: () => void;
  onUnlock?: () => void;
};

export type FPCHandle = {
  lock: () => void;
  unlock: () => void;
};

const supportsRawUpdate = () =>
  typeof window !== "undefined" && "onpointerrawupdate" in window;

export const FirstPersonControls = forwardRef<FPCHandle, Props>(
  function FirstPersonControls(
    { sensitivity = 0.00015, onLock, onUnlock },
    ref
  ) {
    const camera = useThree((s) => s.camera);
    const gl = useThree((s) => s.gl);

    const onLockRef = useRef(onLock);
    const onUnlockRef = useRef(onUnlock);
    onLockRef.current = onLock;
    onUnlockRef.current = onUnlock;

    const yaw = useRef(0);
    const pitch = useRef(0);
    const initialized = useRef(false);

    const accDx = useRef(0);
    const accDy = useRef(0);

    const tmpEuler = useRef(new Euler(0, 0, 0, "YXZ"));

    const syncFromCamera = () => {
      tmpEuler.current.setFromQuaternion(camera.quaternion, "YXZ");
      yaw.current = tmpEuler.current.y;
      pitch.current = tmpEuler.current.x;
      initialized.current = true;
    };

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
          if (p && typeof (p as Promise<void>).then === "function") {
            (p as Promise<void>).catch(() => el.requestPointerLock());
          }
        },
        unlock: () => document.exitPointerLock(),
      }),
      [gl]
    );

    useEffect(() => {
      const el = gl.domElement;
      const eventName = supportsRawUpdate()
        ? "pointerrawupdate"
        : "mousemove";

      if (import.meta.env.DEV) {
        console.log(`[FPC] mouse input via ${eventName}`);
      }

      const handler = (e: Event) => {
        if (document.pointerLockElement !== el) return;
        if (useIntro.getState().playing) return;

        const ev = e as MouseEvent;
        const dx = Math.max(
          -MAX_DELTA_PER_EVENT,
          Math.min(MAX_DELTA_PER_EVENT, ev.movementX)
        );
        const dy = Math.max(
          -MAX_DELTA_PER_EVENT,
          Math.min(MAX_DELTA_PER_EVENT, ev.movementY)
        );
        accDx.current += dx;
        accDy.current += dy;
      };

      const onChange = () => {
        accDx.current = 0;
        accDy.current = 0;
        if (document.pointerLockElement === el) {
          syncFromCamera();
          onLockRef.current?.();
        } else {
          onUnlockRef.current?.();
        }
      };

      document.addEventListener(eventName, handler);
      document.addEventListener("pointerlockchange", onChange);
      return () => {
        document.removeEventListener(eventName, handler);
        document.removeEventListener("pointerlockchange", onChange);
      };
    }, [gl]);

    useFrame(() => {
      if (useIntro.getState().playing) {
        initialized.current = false;
        accDx.current = 0;
        accDy.current = 0;
        return;
      }
      if (!initialized.current) return;
      if (document.pointerLockElement !== gl.domElement) return;
      if (accDx.current === 0 && accDy.current === 0) return;

      let dyaw = -accDx.current * sensitivity;
      let dpitch = -accDy.current * sensitivity;

      if (Math.abs(dyaw) > MAX_ROTATION_PER_FRAME) {
        const applied = Math.sign(dyaw) * MAX_ROTATION_PER_FRAME;
        accDx.current = -(dyaw - applied) / sensitivity;
        dyaw = applied;
      } else {
        accDx.current = 0;
      }

      if (Math.abs(dpitch) > MAX_ROTATION_PER_FRAME) {
        const applied = Math.sign(dpitch) * MAX_ROTATION_PER_FRAME;
        accDy.current = -(dpitch - applied) / sensitivity;
        dpitch = applied;
      } else {
        accDy.current = 0;
      }

      yaw.current += dyaw;
      const desiredPitch = pitch.current + dpitch;
      const clampedPitch = Math.max(
        -PI_2 + 0.01,
        Math.min(PI_2 - 0.01, desiredPitch)
      );
      if (clampedPitch !== desiredPitch) accDy.current = 0;
      pitch.current = clampedPitch;

      tmpEuler.current.set(pitch.current, yaw.current, 0, "YXZ");
      camera.quaternion.setFromEuler(tmpEuler.current);
    });

    return null;
  }
);
