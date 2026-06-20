import { Canvas } from "@react-three/fiber";
import { KeyboardControls, Stats } from "@react-three/drei";
import { useControls, button, folder, Leva } from "leva";
import { useEffect, useRef, useState } from "react";
import { Scene } from "./scene/Scene";
import { Post } from "./scene/Post";
import { Player } from "./scene/Player";
import { Interact } from "./scene/Interact";
import { Jukebox } from "./scene/Jukebox";
import { TVPlayer } from "./scene/TVPlayer";
import { Intro } from "./scene/Intro";
import { SymspyDialogue } from "./scene/SymspyDialogue";
import { symspyDotsPhase, symspyLocked, useSymspy } from "./state/symspy";
import { Retro } from "./scene/Retro";
import { VideoOverlay } from "./scene/VideoOverlay";
import { BookOverlay } from "./scene/BookOverlay";
import { MementosAudio } from "./scene/MementosAudio";
import { BookTrigger } from "./scene/BookTrigger";
import { MonitorTrigger } from "./scene/MonitorTrigger";
import { MonitorScreen } from "./scene/MonitorScreen";
import { Desktop } from "./scene/Desktop";
import { CRTPanel } from "./scene/CRTPanel";
import { useDesktop } from "./state/desktop";
import { initLevaPersistence } from "./lib/levaPersist";

initLevaPersistence();
import {
  FirstPersonControls,
  type FPCHandle,
} from "./scene/FirstPersonControls";
import { useVibe } from "./state/vibe";
import { useInteract } from "./state/interact";
import { useTV } from "./state/tv";
import { useIntro } from "./state/intro";
import { useBook } from "./state/book";
import { useMonitor } from "./state/monitor";

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

const FORTUNES: string[] = [
  "Please join us in rejoicing in the cosmic law of cause and effect",
  "Don't forget your morning sun salutations.",
  "It can feel as though the elders of some strange and austere holy order are watching you in order to discover, by means of signs you make but which only they can read, whether or not you have the true vocation",
];

const TARGET_LABELS: Record<string, string> = {
  Keyboard_click: "Computer",
  Mouse_click: "Computer",
  CPU_click: "Computer",
  Monitor_click_glow: "Computer",
  Sketchfab_model003_click: "Super 8 Videos",
  Sketchfab_model003_click001_glow: "Jukebox",
  Sketchfab_model004_click: "Super 8 Videos",
  Sketchfab_model005_click_glow: "Stircrazy",
  Cigarette_click: "Cigarette",
  Figure_click_solid: "Subconscious Entity",
};

const SMOKING_LINE =
  "Manou had promised me a car if I didn't start before 18. She didn't live to see me make it.";

type InteractText = { text: string; sizePx?: number; holdMs?: number };

const INTERACT_TEXTS: Record<string, InteractText> = {
  Cigarette_click: { text: SMOKING_LINE, sizePx: 18, holdMs: 8000 },
};

export default function App() {
  const [locked, setLocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const fpcRef = useRef<FPCHandle | null>(null);
  const targetName = useInteract((s) => s.targetName);
  const tvMode = useTV((s) => s.mode);
  const bookOpen = useBook((s) => s.open);
  const monitorOpen = useMonitor((s) => s.open);
  const [tvOverlayBlack, setTvOverlayBlack] = useState(false);
  const [tvOverlayImage, setTvOverlayImage] = useState(false);
  const [monitorOverlayBlack, setMonitorOverlayBlack] = useState(false);
  const [monitorOverlayImage, setMonitorOverlayImage] = useState(false);
  const [monitorMounted, setMonitorMounted] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const introPlaying = useIntro((s) => s.playing);
  const introPlayed = useIntro((s) => s.played);
  const symspyPhase = useSymspy((s) => s.phase);
  const symspyHidesCrosshair = symspyLocked(symspyPhase);
  const symspyConsumed = symspyPhase !== "idle";
  const welcomeReady = useIntro(
    (s) => s.played || (s.cam !== null && s.action !== null),
  );
  const [splashMounted, setSplashMounted] = useState(false);
  const [splashVisible, setSplashVisible] = useState(false);
  const [bottomText, setBottomText] = useState<string | null>(null);
  const [bottomTextVisible, setBottomTextVisible] = useState(false);
  const [bottomTextSize, setBottomTextSize] = useState(23);
  const bottomTextTimersRef = useRef<number[]>([]);
  const [oracleFortune, setOracleFortune] = useState<string | null>(null);
  const [oracleFortuneVisible, setOracleFortuneVisible] = useState(false);
  const oracleTimersRef = useRef<number[]>([]);
  const relockTimersRef = useRef<number[]>([]);
  const [splashSuppressed, setSplashSuppressed] = useState(false);
  const splashSuppressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const cancelRelock = () => {
      for (const t of relockTimersRef.current) window.clearTimeout(t);
      relockTimersRef.current = [];
    };

    const suppressSplash = (ms: number) => {
      if (splashSuppressTimerRef.current !== null) {
        window.clearTimeout(splashSuppressTimerRef.current);
      }
      setSplashSuppressed(true);
      splashSuppressTimerRef.current = window.setTimeout(() => {
        setSplashSuppressed(false);
        splashSuppressTimerRef.current = null;
      }, ms);
    };

    const onEsc = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      if (symspyLocked(useSymspy.getState().phase)) return;

      const anyModalOpen = () =>
        useBook.getState().open ||
        useMonitor.getState().open ||
        useTV.getState().mode !== "off";

      const relockLadder = () => {
        cancelRelock();
        setShowWelcome(false);
        fpcRef.current?.lock();
        relockTimersRef.current = [100, 300, 600, 900, 1300, 1700].map(
          (delay) =>
            window.setTimeout(() => {
              if (document.pointerLockElement) return;
              if (anyModalOpen()) return;
              fpcRef.current?.lock();
            }, delay),
        );
      };

      if (useBook.getState().open) {
        suppressSplash(5000);
        useBook.getState().setOpen(false);
        relockLadder();
        return;
      }

      if (useMonitor.getState().open) {
        suppressSplash(5000);
        useMonitor.getState().setOpen(false);
        relockLadder();
        return;
      }

      const mode = useTV.getState().mode;
      if (mode === "playing") {
        useTV.getState().setMode("menu");
        return;
      }
      if (mode !== "off") {
        suppressSplash(5000);
        useTV.getState().setMode("off");
        relockLadder();
        return;
      }

      cancelRelock();
      fpcRef.current?.unlock();
      setShowWelcome(true);
    };
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("keydown", onEsc);
      cancelRelock();
      if (splashSuppressTimerRef.current !== null) {
        window.clearTimeout(splashSuppressTimerRef.current);
        splashSuppressTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (locked) return;
    if (useBook.getState().open) return;
    if (useMonitor.getState().open) return;
    if (useTV.getState().mode !== "off") return;
    if (useIntro.getState().playing) return;
    const phase = useSymspy.getState().phase;
    if (symspyLocked(phase) || symspyDotsPhase(phase)) return;
    setShowWelcome(true);
  }, [locked]);

  useEffect(() => {
    if (bookOpen || monitorOpen || tvMode !== "off") {
      setShowWelcome(false);
    }
  }, [bookOpen, monitorOpen, tvMode]);

  useEffect(() => {
    if (
      locked ||
      showWelcome ||
      tvMode !== "off" ||
      bookOpen ||
      monitorOpen ||
      symspyDotsPhase(symspyPhase)
    )
      return;
    const tryLockKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") return;
      fpcRef.current?.lock();
    };
    const tryLockPointer = () => fpcRef.current?.lock();
    window.addEventListener("keydown", tryLockKey);
    window.addEventListener("pointerdown", tryLockPointer);
    return () => {
      window.removeEventListener("keydown", tryLockKey);
      window.removeEventListener("pointerdown", tryLockPointer);
    };
  }, [locked, showWelcome, tvMode, bookOpen, monitorOpen, symspyPhase]);

  useEffect(() => {
    return useSymspy.subscribe((s, prev) => {
      if (s.phase === prev.phase) return;
      const wasDots = symspyDotsPhase(prev.phase);
      const isDots = symspyDotsPhase(s.phase);
      if (!wasDots && isDots) {
        setShowWelcome(false);
        fpcRef.current?.unlock();
      } else if (wasDots && !isDots) {
        fpcRef.current?.lock();
      }
      if (prev.phase !== "done" && s.phase === "done") {
        setShowWelcome(true);
      }
    });
  }, []);

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
    const onInteract = (e: Event) => {
      const detail = (e as CustomEvent<{ name: string }>).detail;
      if (!detail?.name) return;
      const entry = INTERACT_TEXTS[detail.name];
      if (!entry) return;
      const hold = entry.holdMs ?? 4000;
      for (const t of bottomTextTimersRef.current) window.clearTimeout(t);
      bottomTextTimersRef.current = [];
      setBottomText(entry.text);
      setBottomTextSize(entry.sizePx ?? 23);
      setBottomTextVisible(false);
      bottomTextTimersRef.current.push(
        window.setTimeout(() => setBottomTextVisible(true), 50),
      );
      bottomTextTimersRef.current.push(
        window.setTimeout(() => setBottomTextVisible(false), 50 + 1000 + hold),
      );
      bottomTextTimersRef.current.push(
        window.setTimeout(() => setBottomText(null), 50 + 1000 + hold + 1000),
      );
    };
    window.addEventListener("interact", onInteract);
    return () => {
      window.removeEventListener("interact", onInteract);
      for (const t of bottomTextTimersRef.current) window.clearTimeout(t);
    };
  }, []);

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

  useEffect(() => {
    for (const t of oracleTimersRef.current) window.clearTimeout(t);
    oracleTimersRef.current = [];
    setOracleFortune(null);
    setOracleFortuneVisible(false);

    if (!monitorOpen) {
      setMonitorOverlayImage(false);
      const fadeBlack = window.setTimeout(() => setMonitorOverlayBlack(false), 800);
      const unmount = window.setTimeout(() => setMonitorMounted(false), 1200);
      return () => {
        window.clearTimeout(fadeBlack);
        window.clearTimeout(unmount);
      };
    }
    setMonitorMounted(true);
    const r = requestAnimationFrame(() => {
      setMonitorOverlayBlack(true);
      setMonitorOverlayImage(true);
    });
    return () => cancelAnimationFrame(r);
  }, [monitorOpen]);

  useControls({
    "export vibe to clipboard": button(() => {
      const json = JSON.stringify(useVibe.getState().values, null, 2);
      navigator.clipboard.writeText(json).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      });
      console.log("[vibe]", json);
    }),
    "toggle book": button(() => {
      const s = useBook.getState();
      s.setOpen(!s.open);
    }),
  });

  const {
    contactX,
    contactY,
    contactSize,
    oracleX,
    oracleY,
    oracleSize,
    mementosX,
    mementosY,
    mementosSize,
  } = useControls({
    desktop: folder({
      contactX: { value: 293, min: 0, max: 1920, step: 1 },
      contactY: { value: 203, min: 0, max: 1080, step: 1 },
      contactSize: { value: 140, min: 32, max: 320, step: 1 },
      oracleX: { value: 1383, min: 0, max: 1920, step: 1 },
      oracleY: { value: 420, min: 0, max: 1080, step: 1 },
      oracleSize: { value: 107, min: 32, max: 320, step: 1 },
      mementosX: { value: 918, min: 0, max: 1920, step: 1 },
      mementosY: { value: 203, min: 0, max: 1080, step: 1 },
      mementosSize: { value: 140, min: 32, max: 320, step: 1 },
    }),
  });

  const desktopIcons = [
    {
      id: "contact",
      src: "/images/id_card.png",
      x: contactX,
      y: contactY,
      size: contactSize,
      label: "CONTACT",
    },
    {
      id: "oracle",
      src: "/images/oracle/frame_1.webp",
      x: oracleX,
      y: oracleY,
      size: oracleSize,
      label: "ORACLE",
      frames: [
        { src: "/images/oracle/frame_1.webp", ms: 0 },
        { src: "/images/oracle/frame_2.webp", ms: 180 },
        { src: "/images/oracle/frame_3.webp", ms: 180 },
        { src: "/images/oracle/frame_4.webp", ms: 180 },
        { src: "/images/oracle/frame_5.webp", ms: 0 },
      ],
    },
    {
      id: "mementos",
      src: "/images/folder.webp",
      x: mementosX,
      y: mementosY,
      size: mementosSize,
      label: "MEMENTOS",
    },
  ];

  const onDesktopIconClick = (id: string) => {
    if (id === "oracle") {
      if (FORTUNES.length === 0) return;
      const pool =
        FORTUNES.length > 1 && oracleFortune
          ? FORTUNES.filter((f) => f !== oracleFortune)
          : FORTUNES;
      const next = pool[Math.floor(Math.random() * pool.length)];
      for (const t of oracleTimersRef.current) window.clearTimeout(t);
      oracleTimersRef.current = [];
      setOracleFortune(next);
      if (!oracleFortuneVisible) {
        setOracleFortuneVisible(false);
        oracleTimersRef.current.push(
          window.setTimeout(() => setOracleFortuneVisible(true), 50),
        );
      }
      return;
    }

    for (const t of oracleTimersRef.current) window.clearTimeout(t);
    oracleTimersRef.current = [];
    if (oracleFortune) {
      setOracleFortuneVisible(false);
      oracleTimersRef.current.push(
        window.setTimeout(() => setOracleFortune(null), 300),
      );
    }

    if (id === "contact") {
      useDesktop.getState().open("contact", {
        title: "CONTACT",
        x: 140,
        y: 90,
        w: 520,
        h: 380,
      });
    } else if (id === "mementos") {
      useDesktop.getState().open("mementos", {
        title: "MEMENTOS",
        x: 130,
        y: 80,
        w: 760,
        h: 560,
      });
    }
  };

  return (
    <KeyboardControls map={KEYMAP}>
      <Leva hidden={!import.meta.env.DEV} />
      <Retro />
      <div
        className={`w-screen h-screen relative ${
          symspyDotsPhase(symspyPhase) ? "cursor-pointer" : ""
        }`}
      >
        <svg
          aria-hidden="true"
          style={{ position: "absolute", width: 0, height: 0 }}
        >
          <defs>
            <filter id="grain" x="0%" y="0%" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="2" numOctaves="1" stitchTiles="stitch" seed="3" result="noise" />
              <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0" result="grain" />
              <feComposite in="grain" in2="SourceGraphic" operator="in" result="grainMasked" />
              <feMerge>
                <feMergeNode in="SourceGraphic" />
                <feMergeNode in="grainMasked" />
              </feMerge>
            </filter>
          </defs>
        </svg>
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
          <BookTrigger />
          <MonitorTrigger />
          <Intro />
          <FirstPersonControls
            ref={fpcRef}
            onLock={() => setLocked(true)}
            onUnlock={() => setLocked(false)}
          />
          {import.meta.env.DEV && <Stats />}
        </Canvas>
        {locked && !symspyHidesCrosshair && (() => {
          const isDisabledSymspyHit =
            symspyConsumed && targetName?.startsWith("Figure_click_solid");
          const effectiveTarget = isDisabledSymspyHit ? null : targetName;
          return (
            <>
              <div
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-white/80 pointer-events-none ${
                  effectiveTarget ? "bg-white/80" : ""
                }`}
              />
              {effectiveTarget && (
                <div className="absolute left-1/2 top-1/2 mt-8 -translate-x-1/2 text-white text-[11px] font-mono tracking-wider pointer-events-none text-center leading-tight">
                  <div>{TARGET_LABELS[effectiveTarget] ?? effectiveTarget}</div>
                  <div className="opacity-60 mt-0.5">use left click to interact</div>
                </div>
              )}
            </>
          );
        })()}
        <SymspyDialogue />
        {copied && (
          <div className="absolute bottom-4 right-4 bg-black/70 text-amber-200 text-[15px] px-3 py-2 rounded font-mono tracking-wider">
            vibe copied to clipboard
          </div>
        )}
        {!locked && tvMode === "off" && !bookOpen && !monitorOpen && showWelcome && !splashSuppressed && (
          <div
            className={`absolute inset-0 z-30 select-none ${
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
            {welcomeReady ? (
              <>
                <img
                  src="/images/splash.webp"
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="grain absolute left-[46%] top-[42%] -translate-x-1/2 -translate-y-1/2 h-[101vh] aspect-square pointer-events-none select-none object-contain"
                />
                <div className="absolute left-1/2 top-[75%] -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <div className="text-[30px] mb-3 tracking-[0.2em] uppercase">
                    {introPlayed ? "click to resume" : "click to enter"}
                  </div>
                  <div className="text-[18px] opacity-70 tracking-wider">
                    WASD · mouse to look · shift to run · esc to release
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-[18px] opacity-50 tracking-widest uppercase">
                  loading…
                </div>
              </div>
            )}
          </div>
        )}
        {splashMounted && (
          <div
            className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white text-[23px] font-mono tracking-wider pointer-events-none text-center leading-tight transition-opacity duration-1000 ease-linear"
            style={{ opacity: splashVisible ? 1 : 0 }}
          >
            You woke up from a dream into another dream
          </div>
        )}
        {bottomText && (
          <div
            className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white font-mono tracking-wider pointer-events-none text-center leading-tight transition-opacity duration-1000 ease-linear whitespace-nowrap"
            style={{ opacity: bottomTextVisible ? 1 : 0, fontSize: `${bottomTextSize}px` }}
          >
            {bottomText}
          </div>
        )}
        {introPlaying && (
          <div
            className="absolute inset-0 z-20 bg-black pointer-events-none"
            style={{ animation: "introBlink 4000ms linear forwards" }}
          />
        )}
        {tvMode !== "off" && (
          <div
            className={`absolute inset-0 z-10 bg-black transition-opacity duration-[1500ms] ${
              tvOverlayBlack ? "opacity-100" : "opacity-0"
            }`}
          >
            <div
              className={`absolute inset-0 transition-all duration-[2000ms] ease-out ${
                tvOverlayImage
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-95"
              }`}
            >
              <MonitorScreen
                src="/images/dvd_loading.jpg"
                variant="tv"
                hint="press esc to leave"
              />
            </div>
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
                    width: "25vmin",
                    height: "25vmin",
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
        {monitorMounted && (
          <div
            className={`absolute inset-0 z-10 bg-black transition-opacity duration-[400ms] ${
              monitorOverlayBlack ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="absolute inset-0">
              <MonitorScreen
                src="/images/monitor.webp"
                taskbar
                on={monitorOverlayImage}
                desktopIcons={desktopIcons}
                onIconClick={onDesktopIconClick}
                hint="press esc to leave"
              />
              <Desktop visible={monitorOverlayImage} />
              {oracleFortune && (
                <CRTPanel
                  className="pointer-events-none transition-opacity duration-300"
                  style={{
                    position: "absolute",
                    left: oracleX + oracleSize / 2,
                    top: oracleY + oracleSize + 44,
                    transform: "translateX(-50%)",
                    opacity: oracleFortuneVisible ? 1 : 0,
                    width: 240,
                    zIndex: 20,
                    fontFamily: "'LowresPixel', 'VT323', 'Courier New', monospace",
                  }}
                >
                  <div className="bg-[#F5F1E5] border-2 border-[#3B362C] px-3 py-2 text-[16px] text-center leading-snug text-[#1A1A1A]">
                    {oracleFortune}
                  </div>
                </CRTPanel>
              )}
            </div>
          </div>
        )}
        <VideoOverlay />
        <BookOverlay />
        <MementosAudio />
        {(bookOpen || tvMode === "playing") && (
          <div className="absolute top-4 right-4 z-50 text-[23px] text-white tracking-wider font-mono uppercase pointer-events-none select-none">
            press esc to leave
          </div>
        )}
      </div>
    </KeyboardControls>
  );
}
