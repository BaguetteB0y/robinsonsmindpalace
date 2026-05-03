import { useControls, folder } from "leva";
import { useEffect } from "react";
import { useVibe } from "../state/vibe";
import { jitterUniform } from "./jitter";

export function Retro() {
  const push = useVibe((s) => s.push);
  const values = useControls({
    retro: folder({
      jitterGrid: { value: 320, min: 32, max: 2048, step: 8 },
    }),
  });
  useEffect(() => push("retro", values), [values, push]);
  useEffect(() => {
    jitterUniform.value = values.jitterGrid;
  }, [values.jitterGrid]);
  return null;
}
