import { Canvas } from "@react-three/fiber";
import { KeyboardControls, Stats } from "@react-three/drei";
import { useControls, button } from "leva";
import { useEffect, useRef, useState } from "react";
import { Scene } from "./scene/Scene";
import { Post } from "./scene/Post";
import { Player } from "./scene/Player";
import { Interact } from "./scene/Interact";
import { Jukebox } from "./scene/Jukebox";
import { TVPlayer } from "./scene/TVPlayer";
import { Intro } from "./scene/Intro";
import { Retro } from "./scene/Retro";
import { VideoOverlay } from "./scene/VideoOverlay";
import {
  FirstPersonControls,
  type FPCHandle,
} from "./scene/FirstPersonControls";
import { useVibe } from "./state/vibe";
import { useInteract } from "./state/interact";
import { useTV } from "./state/tv";
import { useIntro } from "./state/intro";

const KEYMAP = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "back", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
  { name: "sprint", keys: ["ShiftLeft"] },
];

const DISCS = [
  { id: "out-west", x: 16.5, y: 42.4, videoIndex: 0 },
  { id: "adios", x: 35.4, y: 42.5, videoIndex: 1 },
  { id: "springwater", x: 55.5, y: 42.7, videoIndex: 2 },
];

export default function App() {
  const [locked, setLocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const fpcRef = useRef<FPCHandle | null>(null);
  const targetName = useInteract((s) => s.targetName);
  const tvMode = useTV((s) => s.mode);
  const [tvOverlayBlack, setTvOverlayBlack] = useState(false);
  const [tvOverlayImage, setTvOverlayImage] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const cooldownActiveRef = useRef(false);
  const [rollKey, setRollKey] = useState(0);
  const introPlaying = useIntro((s) => s.playing);
  const introPlayed = useIntro((s) => s.played);
  const welcomeReady = useIntro(
    (s) => s.played || (s.cam !== null && s.action !== null),
  );
  const [introFadeOut, setIntroFadeOut] = useState(false);
  const [splashMounted, setSplashMounted] = useState(false);
  const [splashVisible, setSplashVisible] = useState(false);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;

      const mode = useTV.getState().mode;
      if (mode === "playing") {
        useTV.getState().setMode("menu");
        return;
      }
      if (mode !== "off") {
        useTV.getState().setMode("off");
        setShowWelcome(false);
        cooldownActiveRef.current = true;
        window.setTimeout(() => {
          cooldownActiveRef.current = false;
        }, 1000);

        fpcRef.current?.lock();
        [100, 300, 600, 900, 1300, 1700].forEach((delay) => {
          window.setTimeout(() => {
            if (document.pointerLockElement) return;
            if (useTV.getState().mode !== "off") return;
            fpcRef.current?.lock();
          }, delay);
        });
        return;
      }

      if (cooldownActiveRef.current) return;
      setShowWelcome(true);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  useEffect(() => {
    if (tvMode === "off") return;
    let timer: number;
    const schedule = () => {
      const delay = 3500 + Math.random() * 6000;
      timer = window.setTimeout(() => {
        setRollKey((k) => k + 1);
        schedule();
      }, delay);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [tvMode]);

  useEffect(() => {
    if (locked || showWelcome || tvMode !== "off") return;
    const tryLock = () => fpcRef.current?.lock();
    window.addEventListener("keydown", tryLock);
    window.addEventListener("pointerdown", tryLock);
    return () => {
      window.removeEventListener("keydown", tryLock);
      window.removeEventListener("pointerdown", tryLock);
    };
  }, [locked, showWelcome, tvMode]);

  useEffect(() => {
    let prev = useIntro.getState().playing;
    return useIntro.subscribe((s) => {
      if (prev && !s.playing) {
        fpcRef.current?.lock();
      }
      prev = s.playing;
    });
  }, []);

  useEffect(() => {
    if (!introPlaying) {
      setIntroFadeOut(false);
      return;
    }
    const r = requestAnimationFrame(() => setIntroFadeOut(true));
    return () => cancelAnimationFrame(r);
  }, [introPlaying]);

  useEffect(() => {
    const timers: number[] = [];
    let prev = useIntro.getState().playing;
    const unsub = useIntro.subscribe((s) => {
      if (!prev && s.playing) {
        setSplashMounted(true);
        timers.push(window.setTimeout(() => setSplashVisible(true), 50));
        timers.push(
          window.setTimeout(() => setSplashVisible(false), 50 + 1000 + 7000),
        );
        timers.push(
          window.setTimeout(
            () => setSplashMounted(false),
            50 + 1000 + 7000 + 1000,
          ),
        );
      }
      prev = s.playing;
    });
    return () => {
      unsub();
      for (const t of timers) window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (tvMode === "off") {
      setTvOverlayBlack(false);
      setTvOverlayImage(false);
      return;
    }
    const r = requestAnimationFrame(() => setTvOverlayBlack(true));
    const t = window.setTimeout(() => setTvOverlayImage(true), 2000);
    return () => {
      cancelAnimationFrame(r);
      window.clearTimeout(t);
    };
  }, [tvMode]);

  useControls({
    "export vibe to clipboard": button(() => {
      const json = JSON.stringify(useVibe.getState().values, null, 2);
      navigator.clipboard.writeText(json).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      });
      console.log("[vibe]", json);
    }),
  });

  return (
    <KeyboardControls map={KEYMAP}>
      <Retro />
      <div className="w-screen h-screen relative">
        <Canvas
          shadows
          dpr={[1, 1.5]}
          gl={{ antialias: false, powerPreference: "high-performance" }}
          camera={{ position: [1.25, 1.65, -5], fov: 60 }}
        >
          <Scene />
          <Player />
          <Post />
          <Interact />
          <Jukebox />
          <TVPlayer />
          <Intro />
          <FirstPersonControls
            ref={fpcRef}
            onLock={() => setLocked(true)}
            onUnlock={() => setLocked(false)}
          />
          <Stats />
        </Canvas>
        {locked && (
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-white/80 pointer-events-none ${
              targetName ? "bg-white/80" : ""
            }`}
          />
        )}
        {locked && targetName && (
          <div className="absolute left-1/2 top-1/2 mt-4 -translate-x-1/2 text-white text-[9px] font-mono tracking-wider pointer-events-none text-center leading-tight">
            <div>use left click to interact</div>
            <div className="opacity-60 mt-0.5">[{targetName}]</div>
          </div>
        )}
        {copied && (
          <div className="absolute bottom-4 right-4 bg-black/70 text-amber-200 text-xs px-3 py-2 rounded font-mono tracking-wider">
            vibe copied to clipboard
          </div>
        )}
        {!locked && tvMode === "off" && showWelcome && (
          <div
            className={`absolute inset-0 flex items-center justify-center select-none ${
              introPlayed ? "bg-black/50" : "bg-black"
            } ${welcomeReady ? "cursor-pointer" : "cursor-default"}`}
            onClick={() => {
              const intro = useIntro.getState();
              if (!welcomeReady) return;
              if (!intro.played && !intro.playing) {
                fpcRef.current?.lock();
                intro.start();
              } else {
                fpcRef.current?.lock();
              }
            }}
          >
            <div className="text-center">
              {welcomeReady ? (
                <>
                  <div className="text-2xl mb-3 tracking-[0.2em] uppercase">
                    click to walk
                  </div>
                  <div className="text-sm opacity-70 tracking-wider">
                    WASD · mouse to look · shift to run · esc to release
                  </div>
                </>
              ) : (
                <div className="text-sm opacity-50 tracking-widest uppercase">
                  loading…
                </div>
              )}
            </div>
          </div>
        )}
        {splashMounted && (
          <div
            className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white text-[18px] font-mono tracking-wider pointer-events-none text-center leading-tight transition-opacity duration-1000 ease-linear"
            style={{ opacity: splashVisible ? 1 : 0 }}
          >
            You woke up from a dream into another dream
          </div>
        )}
        {introPlaying && (
          <div
            className="absolute inset-0 z-20 bg-black pointer-events-none transition-opacity duration-[2000ms] delay-1000 ease-linear"
            style={{ opacity: introFadeOut ? 0 : 1 }}
          />
        )}
        {tvMode !== "off" && (
          <div
            className={`absolute inset-0 z-10 bg-black transition-opacity duration-[1500ms] ${
              tvOverlayBlack ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src="/images/dvd_loading.jpg"
              alt=""
              draggable={false}
              className={`w-full h-full object-cover select-none transition-all duration-[2000ms] ease-out ${
                tvOverlayImage
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-95"
              }`}
            />
            {tvOverlayImage && (
              <img
                key={`roll-${rollKey}`}
                src="/images/dvd_loading.jpg"
                alt=""
                draggable={false}
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{
                  transform: "translateX(-0.5%)",
                  animation: "tvRoll 2s linear forwards",
                }}
              />
            )}
            {tvOverlayImage &&
              tvMode === "menu" &&
              DISCS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  aria-label={d.id}
                  className="absolute rounded-full cursor-pointer"
                  style={{
                    left: `${d.x}%`,
                    top: `${d.y}%`,
                    width: "15vmin",
                    height: "15vmin",
                    transform: "translate(-50%, -50%)",
                  }}
                  onClick={() => {
                    useTV.getState().setVideoIndex(d.videoIndex);
                    useTV.getState().setMode("playing");
                  }}
                />
              ))}
          </div>
        )}
        <VideoOverlay />
      </div>
    </KeyboardControls>
  );
}
