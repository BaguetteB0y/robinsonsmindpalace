import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
  Pixelation,
  HueSaturation,
  BrightnessContrast,
  SSAO,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useControls, folder } from "leva";
import { useEffect, useRef } from "react";
import { Vector2 } from "three";
import { useVibe } from "../state/vibe";
import { Roll } from "./Roll";
import { Trail } from "./Trail";

export function Post() {
  const push = useVibe((s) => s.push);
  const [values, setLeva] = useControls(() => ({
    bleed: folder({
      trail: { value: 0, min: 0, max: 0.99, step: 0.01 },
    }),
    post: folder({
      bloomIntensity: { value: 0.45, min: 0, max: 3, step: 0.05 },
      bloomThreshold: { value: 0.92, min: 0, max: 1, step: 0.01 },
      vignetteDarkness: { value: 0.5, min: 0, max: 1.5, step: 0.01 },
      vignetteOffset: { value: 0.32, min: 0, max: 1, step: 0.01 },
      noiseOpacity: { value: 0.175, min: 0, max: 0.4, step: 0.005 },
      pixelGranularity: { value: 3, min: 1, max: 12, step: 1 },
      saturation: { value: 0.3, min: -1, max: 1, step: 0.01 },
      contrast: { value: 0.05, min: -1, max: 1, step: 0.01 },
      brightness: { value: 0, min: -0.5, max: 0.5, step: 0.01 },
      ssaoIntensity: { value: 18, min: 0, max: 60, step: 1 },
      ssaoRadius: { value: 0.18, min: 0, max: 1, step: 0.01 },
      ssaoSamples: { value: 6, min: 1, max: 32, step: 1 },
      rollSpeed: { value: 0.5, min: 0, max: 2, step: 0.01 },
      rollRowHeight: { value: 0.004, min: 0, max: 0.05, step: 0.001 },
      rollShift: { value: 0.005, min: 0, max: 0.05, step: 0.001 },
      rollMinDelay: { value: 4, min: 0, max: 30, step: 0.5 },
      rollMaxDelay: { value: 10, min: 0, max: 30, step: 0.5 },
      chromaticOffset: { value: 0.0007, min: 0, max: 0.01, step: 0.0001 },
    }),
  }));

  useEffect(() => push("post", values), [values, push]);

  const trailRef = useRef(values.trail);
  trailRef.current = values.trail;
  const savedTrailRef = useRef(0.95);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Digit0") return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const cur = trailRef.current;
      if (cur > 0) {
        savedTrailRef.current = cur;
        setLeva({ trail: 0 });
      } else {
        setLeva({ trail: savedTrailRef.current });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setLeva]);

  const {
    bloomIntensity,
    bloomThreshold,
    vignetteDarkness,
    vignetteOffset,
    noiseOpacity,
    pixelGranularity,
    saturation,
    contrast,
    brightness,
    ssaoIntensity,
    ssaoRadius,
    ssaoSamples,
    rollSpeed,
    rollRowHeight,
    rollShift,
    rollMinDelay,
    rollMaxDelay,
    chromaticOffset,
    trail,
  } = values;

  return (
    <EffectComposer multisampling={0}>
      <SSAO
        blendFunction={BlendFunction.MULTIPLY}
        samples={ssaoSamples}
        radius={ssaoRadius}
        intensity={ssaoIntensity}
        luminanceInfluence={0.5}
        worldDistanceThreshold={1}
        worldDistanceFalloff={1}
        worldProximityThreshold={0.5}
        worldProximityFalloff={0.5}
      />
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
      <HueSaturation hue={0} saturation={saturation} />
      <BrightnessContrast brightness={brightness} contrast={contrast} />
      <Vignette
        darkness={vignetteDarkness}
        offset={vignetteOffset}
        eskil={false}
      />
      <Pixelation granularity={pixelGranularity} />
      <Roll
        speed={rollSpeed}
        rowHeight={rollRowHeight}
        shift={rollShift}
        minDelay={rollMinDelay}
        maxDelay={rollMaxDelay}
      />
      <ChromaticAberration
        offset={new Vector2(chromaticOffset, chromaticOffset)}
        radialModulation={false}
        modulationOffset={0}
      />
      <Noise opacity={noiseOpacity} blendFunction={BlendFunction.OVERLAY} />
      <Trail persistence={trail} />
    </EffectComposer>
  );
}
