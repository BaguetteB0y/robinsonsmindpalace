import { useControls, folder } from "leva";
import { Color, FogExp2 } from "three";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { Room, R } from "./Room";
import { Props } from "./Props";
import { useVibe } from "../state/vibe";

export function Scene() {
  const { scene } = useThree();
  const push = useVibe((s) => s.push);

  const values = useControls({
    world: folder({
      bgColor: "#2a1f24",
      fogColor: "#aa4614",
      fogDensity: { value: 0.04, min: 0, max: 0.3, step: 0.005 },
    }),
    lighting: folder({
      sunColor: "#f57e42",
      sunIntensity: { value: 2.8, min: 0, max: 8, step: 0.05 },
      sunAzimuth: { value: 85, min: -90, max: 90, step: 1 },
      sunElevation: { value: 32, min: 0, max: 80, step: 1 },
      sunDist: { value: 3.23, min: 0.3, max: 8, step: 0.01 },
      sunAngle: { value: 58, min: 10, max: 90, step: 1 },
      sunPenumbra: { value: 0.67, min: 0, max: 1, step: 0.01 },
      fillColor: "#a34e23",
      fillIntensity: { value: 0.35, min: 0, max: 3, step: 0.05 },
      ambientColor: "#372a3b",
      ambientIntensity: { value: 2.25, min: 0, max: 3, step: 0.05 },
      windowLightColor: "#fc8d55",
      windowLightIntensity: { value: 0.7, min: 0, max: 25, step: 0.1 },
    }),
  });

  useEffect(() => push("scene", values), [values, push]);

  const {
    bgColor,
    fogColor,
    fogDensity,
    sunColor,
    sunIntensity,
    sunAzimuth,
    sunElevation,
    sunDist,
    sunAngle,
    sunPenumbra,
    fillColor,
    fillIntensity,
    ambientColor,
    ambientIntensity,
    windowLightColor,
    windowLightIntensity,
  } = values;

  useEffect(() => {
    scene.background = new Color(bgColor);
    scene.fog = new FogExp2(fogColor, fogDensity);
  }, [scene, bgColor, fogColor, fogDensity]);

  const az = (sunAzimuth * Math.PI) / 180;
  const el = (sunElevation * Math.PI) / 180;
  const dist = sunDist;
  const sunX = Math.sin(az) * Math.cos(el) * dist;
  const sunY = Math.sin(el) * dist;
  const sunZ = Math.cos(az) * Math.cos(el) * dist + 4;

  const winCx = R.W / 2 - R.winW / 2;
  const winH = R.height - R.winSill;
  const winCy = R.winSill + winH / 2;
  const winCz = R.D / 2 - 0.1;

  return (
    <>
      <ambientLight color={ambientColor} intensity={ambientIntensity} />
      <spotLight
        position={[sunX, sunY, sunZ]}
        color={sunColor}
        intensity={sunIntensity}
        angle={(sunAngle * Math.PI) / 180}
        penumbra={sunPenumbra}
        distance={0}
        decay={0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={25}
        shadow-bias={-0.0005}
      />
      <directionalLight
        position={[-3, 2, -3]}
        color={fillColor}
        intensity={fillIntensity}
      />
      <rectAreaLight
        position={[winCx, winCy, winCz]}
        width={R.winW}
        height={winH}
        color={windowLightColor}
        intensity={windowLightIntensity}
      />
      <Room />
      <Props />
    </>
  );
}
