import { useControls, folder } from "leva";
import { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { NearestFilter, RepeatWrapping, Texture } from "three";
import { useVibe } from "../state/vibe";
import { jitterOnBeforeCompile } from "./jitter";

export const R = {
  W: 5.5,
  D: 8,
  height: 2.7,
  thickness: 0.15,

  foyerW: 2,
  foyerD: 2,

  winSill: 0.8,
  winW: 1.5,

  doorW: 0.95,
  doorH: 2.05,
};

type SegProps = {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
  map?: Texture;
  cast?: boolean;
};

function Seg({ position, size, color = "#ffffff", map, cast = true }: SegProps) {
  return (
    <mesh position={position} castShadow={cast} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        map={map}
        flatShading
        onBeforeCompile={jitterOnBeforeCompile}
      />
    </mesh>
  );
}

export function Room() {
  const push = useVibe((s) => s.push);
  const values = useControls({
    room: folder({
      wallColor: "#d8c8b0",
      ceilingColor: "#bfae93",
      baseboardColor: "#3a2a1c",
      skyColor: "#ffb37a",
      floorTileDensity: { value: 0.36, min: 0.05, max: 2, step: 0.01 },
    }),
  });
  useEffect(() => push("room", values), [values, push]);
  const {
    wallColor,
    ceilingColor,
    baseboardColor,
    skyColor,
    floorTileDensity,
  } = values;

  const floorTexBase = useTexture("/textures/floor.png");
  const { mainFloorTex, foyerFloorTex } = useMemo(() => {
    const make = (worldW: number, worldD: number, ox = 0, oy = 0) => {
      const tx = floorTexBase.clone();
      tx.wrapS = tx.wrapT = RepeatWrapping;
      tx.magFilter = NearestFilter;
      tx.minFilter = NearestFilter;
      tx.anisotropy = 1;
      tx.center.set(0.5, 0.5);
      tx.rotation = Math.PI / 2;
      tx.repeat.set(worldD * floorTileDensity, worldW * floorTileDensity);
      tx.offset.set(ox, oy);
      tx.needsUpdate = true;
      return tx;
    };
    return {
      mainFloorTex: make(R.W, R.D),
      foyerFloorTex: make(
        R.foyerW,
        R.foyerD,
        -0.5 * floorTileDensity * (R.D + R.foyerD),
        -0.5 * floorTileDensity * (R.W - R.foyerW),
      ),
    };
  }, [floorTexBase, floorTileDensity]);

  const W = R.W, D = R.D, H = R.height, t = R.thickness;
  const halfW = W / 2, halfD = D / 2;

  const fW = R.foyerW, fD = R.foyerD;
  const fEastX = halfW;
  const fWestX = halfW - fW;
  const fNorthZ = -halfD;
  const fSouthZ = -halfD - fD;
  const fCx = (fEastX + fWestX) / 2;

  const winRightX = halfW;
  const winLeftX = halfW - R.winW;
  const winCenterX = (winLeftX + winRightX) / 2;
  const winH = H - R.winSill;
  const lintelH = H - (R.winSill + winH);

  const nLeftLen = winLeftX - -halfW;
  const nRightLen = halfW - winRightX;

  const sMainWestLen = fWestX - -halfW;

  const eastWallZc = (fSouthZ + halfD) / 2;
  const eastWallLen = halfD - fSouthZ;

  const doorLeftX = fCx - R.doorW / 2;
  const doorRightX = fCx + R.doorW / 2;
  const fSouthLeftLen = doorLeftX - fWestX;
  const fSouthRightLen = fEastX - doorRightX;
  const doorLintelH = H - R.doorH;

  return (
    <group>
      <Seg
        position={[0, -0.025, 0]}
        size={[W, 0.05, D]}
        map={mainFloorTex}
        cast={false}
      />
      <Seg
        position={[fCx, -0.025, (fNorthZ + fSouthZ) / 2]}
        size={[fW, 0.05, fD]}
        map={foyerFloorTex}
        cast={false}
      />

      <Seg position={[0, H, 0]} size={[W, 0.05, D]} color={ceilingColor} cast />
      <Seg
        position={[fCx, H, (fNorthZ + fSouthZ) / 2]}
        size={[fW, 0.05, fD]}
        color={ceilingColor}
        cast
      />

      {nLeftLen > 0.001 && (
        <Seg
          position={[-halfW + nLeftLen / 2, H / 2, halfD]}
          size={[nLeftLen, H, t]}
          color={wallColor}
        />
      )}
      {nRightLen > 0.001 && (
        <Seg
          position={[winRightX + nRightLen / 2, H / 2, halfD]}
          size={[nRightLen, H, t]}
          color={wallColor}
        />
      )}
      <Seg
        position={[winCenterX, R.winSill / 2, halfD]}
        size={[R.winW, R.winSill, t]}
        color={wallColor}
      />
      {lintelH > 0.001 && (
        <Seg
          position={[winCenterX, H - lintelH / 2, halfD]}
          size={[R.winW, lintelH, t]}
          color={wallColor}
        />
      )}
      <mesh position={[winCenterX, R.winSill + winH / 2, halfD + 0.01]}>
        <planeGeometry args={[R.winW - 0.04, winH - 0.04]} />
        <meshBasicMaterial color={skyColor} toneMapped={false} />
      </mesh>

      <Seg
        position={[halfW, H / 2, eastWallZc]}
        size={[t, H, eastWallLen]}
        color={wallColor}
      />

      <Seg
        position={[-halfW, H / 2, 0]}
        size={[t, H, D]}
        color={wallColor}
      />

      <Seg
        position={[-halfW + sMainWestLen / 2, H / 2, -halfD]}
        size={[sMainWestLen, H, t]}
        color={wallColor}
      />

      <Seg
        position={[fWestX, H / 2, (fNorthZ + fSouthZ) / 2]}
        size={[t, H, fD]}
        color={wallColor}
      />

      {fSouthLeftLen > 0.001 && (
        <Seg
          position={[fWestX + fSouthLeftLen / 2, H / 2, fSouthZ]}
          size={[fSouthLeftLen, H, t]}
          color={wallColor}
        />
      )}
      {fSouthRightLen > 0.001 && (
        <Seg
          position={[doorRightX + fSouthRightLen / 2, H / 2, fSouthZ]}
          size={[fSouthRightLen, H, t]}
          color={wallColor}
        />
      )}
      {doorLintelH > 0.001 && (
        <Seg
          position={[fCx, H - doorLintelH / 2, fSouthZ]}
          size={[R.doorW, doorLintelH, t]}
          color={wallColor}
        />
      )}

      <Seg
        position={[0, 0.05, halfD - t / 2 - 0.025]}
        size={[W, 0.1, 0.05]}
        color={baseboardColor}
      />
      <Seg
        position={[-halfW + sMainWestLen / 2, 0.05, -halfD + t / 2 + 0.025]}
        size={[sMainWestLen, 0.1, 0.05]}
        color={baseboardColor}
      />
      <Seg
        position={[-halfW + t / 2 + 0.025, 0.05, 0]}
        size={[0.05, 0.1, D]}
        color={baseboardColor}
      />
      <Seg
        position={[halfW - t / 2 - 0.025, 0.05, eastWallZc]}
        size={[0.05, 0.1, eastWallLen]}
        color={baseboardColor}
      />
      <Seg
        position={[fWestX + t / 2 + 0.025, 0.05, (fNorthZ + fSouthZ) / 2]}
        size={[0.05, 0.1, fD]}
        color={baseboardColor}
      />
    </group>
  );
}
