import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { LoopOnce, Quaternion, Vector3 } from "three";
import { useIntro } from "../state/intro";

const YAW_OFFSET = new Quaternion().setFromAxisAngle(
  new Vector3(0, 1, 0),
  -Math.PI / 2,
);
const tmpQuat = new Quaternion();

const YAWN_URL = "/audio/yawn.mp3";
const YAWN_DELAY_MS = 1200;
const YAWN_VOLUME = 0.6;

export function Intro() {
  const { camera } = useThree();
  const yawnRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio(YAWN_URL);
    a.volume = YAWN_VOLUME;
    a.addEventListener("error", () =>
      console.warn("[yawn] failed to load:", YAWN_URL, a.error),
    );
    yawnRef.current = a;
    return () => {
      a.pause();
      a.src = "";
      yawnRef.current = null;
    };
  }, []);

  useEffect(() => {
    let prev = useIntro.getState().playing;
    let yawnTimer: number | null = null;
    const unsub = useIntro.subscribe((s) => {
      if (!prev && s.playing) {
        const { action, cam } = useIntro.getState();
        console.log(
          "[intro] subscribe: playing flipped on. action=",
          !!action,
          "cam=",
          !!cam,
          "duration=",
          action?.getClip().duration,
        );
        if (!action) {
          useIntro.getState().end();
        } else {
          action.reset();
          action.setLoop(LoopOnce, 1);
          action.clampWhenFinished = true;
          action.play();
        }
        yawnTimer = window.setTimeout(() => {
          const a = yawnRef.current;
          if (!a) return;
          a.currentTime = 0;
          a.play().catch((err) => console.warn("[yawn] play:", err));
        }, YAWN_DELAY_MS);
      }
      prev = s.playing;
    });
    return () => {
      unsub();
      if (yawnTimer !== null) window.clearTimeout(yawnTimer);
    };
  }, []);

  useFrame(() => {
    const { playing, cam, action } = useIntro.getState();
    if (!playing) return;
    if (cam) {
      cam.getWorldPosition(camera.position);
      cam.getWorldQuaternion(tmpQuat);
      tmpQuat.premultiply(YAW_OFFSET);
      camera.quaternion.copy(tmpQuat);
    }
    if (action) {
      const dur = action.getClip().duration;
      if (dur > 0 && action.time >= dur) {
        action.stop();
        useIntro.getState().end();
      }
    }
  });

  return null;
}
