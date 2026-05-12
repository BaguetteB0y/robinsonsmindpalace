import { useEffect, useRef } from "react";
import { useControls, folder } from "leva";
import { useCrt } from "../state/crt";

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_res;
uniform float u_curve;
uniform float u_vignette;
uniform float u_scanline;
uniform float u_rollY;
uniform float u_rollWidth;
uniform float u_rollOffset;
uniform float u_phosphor;
uniform float u_phosphorScale;
uniform float u_flicker;
uniform float u_time;
uniform float u_power;

vec3 phosphorMask(float x) {
  float c = mod(floor(x), 3.0);
  float r = step(c, 0.5);
  float g = step(0.5, c) - step(1.5, c);
  float b = step(1.5, c);
  return vec3(0.55) + 0.45 * vec3(r, g, b);
}

vec2 curveUV(vec2 uv) {
  vec2 c = uv * 2.0 - 1.0;
  vec2 offset = abs(c.yx) / vec2(u_curve);
  c = c + c * offset * offset;
  return c * 0.5 + 0.5;
}

void main() {
  vec2 uv = curveUV(v_uv);

  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec2 sampleUV = uv;
  if (u_rollY > 0.0 && abs(uv.y - u_rollY) < u_rollWidth) {
    sampleUV.x += u_rollOffset;
  }

  vec3 col = texture2D(u_tex, sampleUV).rgb;

  vec2 vc = uv - 0.5;
  float vd = length(vc) * 1.4;
  col *= mix(1.0, smoothstep(0.95, 0.2, vd), u_vignette);

  float scan = 0.5 + 0.5 * sin(uv.y * u_res.y * 1.5);
  col *= mix(1.0, scan, u_scanline);

  vec3 mask = phosphorMask(v_uv.x * u_res.x / max(u_phosphorScale, 0.0001));
  col *= mix(vec3(1.0), mask, u_phosphor);

  float flickerHz = 0.5 + 0.5 * sin(u_time * 376.99);
  float flickerNoise = fract(sin(u_time * 47.13) * 43758.5453) * 2.0 - 1.0;
  float flickerVal = 1.0 - u_flicker * (0.06 * flickerHz + 0.04 * flickerNoise);
  col *= flickerVal;

  float p = clamp(u_power, 0.0, 1.0);
  if (p <= 0.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  float linePhase = clamp(p / 0.4, 0.0, 1.0);
  float expandPhase = clamp((p - 0.4) / 0.6, 0.0, 1.0);
  float bandHalf = expandPhase * 0.5;
  float yDist = abs(v_uv.y - 0.5);

  if (yDist > bandHalf) {
    float lineHalf = 0.005;
    float lineMask = smoothstep(lineHalf, 0.0, yDist) * (1.0 - expandPhase) * linePhase;
    gl_FragColor = vec4(vec3(lineMask), 1.0);
    return;
  }
  float bandFade = smoothstep(bandHalf, max(bandHalf - 0.02, 0.0), yDist);
  col *= bandFade;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error("[monitor] shader:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    throw new Error("shader compile failed");
  }
  return sh;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawFolderIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 16;
  ctx.fillStyle = "#E8C56A";
  ctx.strokeStyle = "#1A1A1A";
  ctx.lineWidth = Math.max(1, s);
  ctx.fillRect(x + s, y + 4 * s, 14 * s, 10 * s);
  ctx.strokeRect(x + s, y + 4 * s, 14 * s, 10 * s);
  ctx.fillStyle = "#E8C56A";
  ctx.fillRect(x + s, y + 3 * s, 6 * s, 2 * s);
  ctx.strokeRect(x + s, y + 3 * s, 6 * s, 2 * s);
}

function drawDiskIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 16;
  ctx.fillStyle = "#4A4538";
  ctx.strokeStyle = "#1A1A1A";
  ctx.lineWidth = Math.max(1, s);
  ctx.fillRect(x + s, y + s, 14 * s, 14 * s);
  ctx.strokeRect(x + s, y + s, 14 * s, 14 * s);
  ctx.fillStyle = "#B5B0A4";
  ctx.fillRect(x + 3 * s, y + 2 * s, 10 * s, 5 * s);
  ctx.fillRect(x + 4 * s, y + 9 * s, 8 * s, 5 * s);
  ctx.fillStyle = "#1A1A1A";
  ctx.fillRect(x + 10 * s, y + 3 * s, 2 * s, 3 * s);
}

function drawSmiley(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 16;
  ctx.fillStyle = "#FFD93D";
  ctx.strokeStyle = "#1A1A1A";
  ctx.lineWidth = Math.max(1, s);
  ctx.beginPath();
  ctx.arc(x + 8 * s, y + 8 * s, 7 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1A1A1A";
  ctx.fillRect(x + 5 * s, y + 5 * s, 2 * s, 2 * s);
  ctx.fillRect(x + 9 * s, y + 5 * s, 2 * s, 2 * s);
  ctx.fillRect(x + 4 * s, y + 10 * s, s, s);
  ctx.fillRect(x + 5 * s, y + 11 * s, s, s);
  ctx.fillRect(x + 6 * s, y + 12 * s, 4 * s, s);
  ctx.fillRect(x + 10 * s, y + 11 * s, s, s);
  ctx.fillRect(x + 11 * s, y + 10 * s, s, s);
}

function drawTaskbarItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  title: string,
  icon: "folder" | "disk",
  S: number,
) {
  ctx.font = `${20 * S}px 'VT323', 'Courier New', monospace`;
  const titleW = ctx.measureText(title).width;
  const iconW = 18 * S;
  const padL = 14 * S;
  const padR = 18 * S;
  const gap = 8 * S;
  const w = padL + iconW + gap + titleW + padR;
  const radius = 14 * S;
  const top = y + 4 * S;
  const inH = h - 8 * S;

  ctx.save();
  roundRectPath(ctx, x, top, w, inH, radius);
  ctx.clip();
  const bg = ctx.createLinearGradient(0, top, 0, top + inH);
  bg.addColorStop(0, "#D8D4C8");
  bg.addColorStop((3 * S) / inH, "#D8D4C8");
  bg.addColorStop((3 * S) / inH, "#BEB9AC");
  bg.addColorStop((inH - 4 * S) / inH, "#BEB9AC");
  bg.addColorStop((inH - 4 * S) / inH, "#9A9588");
  bg.addColorStop(1, "#9A9588");
  ctx.fillStyle = bg;
  ctx.fillRect(x, top, w, inH);
  ctx.restore();

  ctx.strokeStyle = "#4A4538";
  ctx.lineWidth = Math.max(1, S);
  roundRectPath(ctx, x + 0.5 * S, top + 0.5 * S, w - S, inH - S, radius);
  ctx.stroke();

  const iconY = y + (h - iconW) / 2;
  if (icon === "folder") drawFolderIcon(ctx, x + padL, iconY, iconW);
  else drawDiskIcon(ctx, x + padL, iconY, iconW);

  ctx.fillStyle = "#1A1A1A";
  ctx.font = `${20 * S}px 'VT323', 'Courier New', monospace`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(title, x + padL + iconW + gap, y + h / 2);

  return x + w + 4 * S;
}

type PowerKF = { t: number; p: number };

const ON_KEYFRAMES: PowerKF[] = [
  { t: 0, p: 0 },
  { t: 700, p: 1 },
];

function evalPower(kf: PowerKF[], t: number): number {
  if (t <= kf[0].t) return kf[0].p;
  const last = kf[kf.length - 1];
  if (t >= last.t) return last.p;
  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i];
    const b = kf[i + 1];
    if (t >= a.t && t <= b.t) {
      const k = (t - a.t) / (b.t - a.t);
      return a.p + (b.p - a.p) * k;
    }
  }
  return last.p;
}

function drawTaskbar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  S: number,
  now: Date,
) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = "#C8C4B8";
  ctx.fillRect(x, y, w, 3 * S);
  ctx.fillStyle = "#B5B0A4";
  ctx.fillRect(x, y + 3 * S, w, h - 9 * S);
  ctx.fillStyle = "#8E897C";
  ctx.fillRect(x, y + h - 6 * S, w, 4 * S);
  ctx.fillStyle = "#4A4538";
  ctx.fillRect(x, y + h - 2 * S, w, 2 * S);

  ctx.font = `italic 900 ${22 * S}px 'Courier New', monospace`;
  const brandTextW = ctx.measureText("dreamweaver").width;
  ctx.font = `bold ${14 * S}px 'Courier New', monospace`;
  const sfxTextW = ctx.measureText("OS").width;
  const brandPadL = 18 * S;
  const brandPadR = 22 * S;
  const brandGap = 4 * S;
  const brandW = brandPadL + brandTextW + brandGap + sfxTextW + brandPadR;
  const brandR = 14 * S;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + brandW - brandR, y);
  ctx.quadraticCurveTo(x + brandW, y, x + brandW, y + brandR);
  ctx.lineTo(x + brandW, y + h - brandR);
  ctx.quadraticCurveTo(x + brandW, y + h, x + brandW - brandR, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#F0ECE0";
  ctx.fillRect(x, y, brandW, 4 * S);
  ctx.fillStyle = "#DCD7C8";
  ctx.fillRect(x, y + 4 * S, brandW, h - 10 * S);
  ctx.fillStyle = "#8E897C";
  ctx.fillRect(x, y + h - 6 * S, brandW, 6 * S);
  ctx.restore();

  ctx.fillStyle = "#1A1A1A";
  ctx.font = `italic 900 ${22 * S}px 'Courier New', monospace`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("dreamweaver", x + brandPadL, y + h / 2);

  ctx.fillStyle = "#4A4538";
  ctx.font = `bold ${14 * S}px 'Courier New', monospace`;
  ctx.fillText("OS", x + brandPadL + brandTextW + brandGap, y + h / 2 - 5 * S);

  ctx.strokeStyle = "#4A4538";
  ctx.lineWidth = Math.max(1, 2 * S);
  ctx.beginPath();
  ctx.moveTo(x + brandW, y);
  ctx.lineTo(x + brandW, y + h);
  ctx.stroke();

  let cursor = x + brandW + 8 * S;
  cursor = drawTaskbarItem(ctx, cursor, y, h, "Folder", "folder", S);
  cursor = drawTaskbarItem(ctx, cursor, y, h, "Folder", "folder", S);
  cursor = drawTaskbarItem(ctx, cursor, y, h, "Disk", "disk", S);

  const padR = 18 * S;
  const smilSize = 28 * S;
  const smilX = x + w - padR - smilSize;
  const smilY = y + (h - smilSize) / 2;
  drawSmiley(ctx, smilX, smilY, smilSize);

  const clockText = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  ctx.fillStyle = "#1A1A1A";
  ctx.font = `bold ${22 * S}px 'VT323', 'Courier New', monospace`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  ctx.fillText(clockText, smilX - 14 * S, y + h / 2);

  ctx.restore();
}

type Variant = "monitor" | "tv";

export type IconFrame = { src: string; ms: number };

export type DesktopIcon = {
  id: string;
  src: string;
  x: number;
  y: number;
  size: number;
  label?: string;
  frames?: IconFrame[];
};

type Props = {
  src: string;
  variant?: Variant;
  taskbar?: boolean;
  on?: boolean;
  desktopIcons?: DesktopIcon[];
  onIconClick?: (id: string) => void;
};

const DEFAULTS: Record<
  Variant,
  {
    curve: number;
    vignette: number;
    scanline: number;
    phosphor: number;
    phosphorScale: number;
    flicker: number;
  }
> = {
  monitor: { curve: 5, vignette: 0.13, scanline: 0, phosphor: 0.3, phosphorScale: 1.0, flicker: 0.4 },
  tv: { curve: 4, vignette: 0.08, scanline: 0.12, phosphor: 0.25, phosphorScale: 1.0, flicker: 0.3 },
};

export function MonitorScreen({
  src,
  variant = "monitor",
  taskbar = false,
  on = true,
  desktopIcons,
  onIconClick,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rollStartRef = useRef<number | null>(null);
  const powerAnimRef = useRef<{ kf: { t: number; p: number }[]; start: number }>({
    kf: [{ t: 0, p: 0 }],
    start: performance.now(),
  });
  const imgLoadedRef = useRef(false);
  const desiredOnRef = useRef(on);
  const iconsRef = useRef<DesktopIcon[] | undefined>(desktopIcons);
  iconsRef.current = desktopIcons;
  const onIconClickRef = useRef<typeof onIconClick>(onIconClick);
  onIconClickRef.current = onIconClick;
  const dirtyRef = useRef(false);
  const hoveredIconIdRef = useRef<string | null>(null);
  const iconAnimRef = useRef<Map<string, { hovered: boolean; frameIndex: number; lastFrameStart: number }>>(
    new Map(),
  );

  const d = DEFAULTS[variant];
  const {
    curve,
    vignette,
    scanline,
    phosphor,
    phosphorScale,
    flicker,
    rollDuration,
    rollOffset,
    rollIntervalMin,
    rollIntervalMax,
  } = useControls({
    [variant]: folder({
      curve: { value: d.curve, min: 1, max: 30, step: 0.5 },
      vignette: { value: d.vignette, min: 0, max: 1, step: 0.01 },
      scanline: { value: d.scanline, min: 0, max: 0.3, step: 0.01 },
      phosphor: { value: d.phosphor, min: 0, max: 1, step: 0.01 },
      phosphorScale: { value: d.phosphorScale, min: 0.5, max: 6, step: 0.1 },
      flicker: { value: d.flicker, min: 0, max: 1, step: 0.01 },
      rollDuration: { value: 2.0, min: 0.5, max: 5, step: 0.1 },
      rollOffset: { value: 0.005, min: 0, max: 0.05, step: 0.001 },
      rollIntervalMin: { value: 1.5, min: 0.2, max: 20, step: 0.1 },
      rollIntervalMax: { value: 9.0, min: 0.2, max: 20, step: 0.1 },
    }),
  });

  const settingsRef = useRef({
    curve,
    vignette,
    scanline,
    phosphor,
    phosphorScale,
    flicker,
    rollDuration,
    rollOffset,
    rollIntervalMin,
    rollIntervalMax,
  });
  settingsRef.current = {
    curve,
    vignette,
    scanline,
    phosphor,
    phosphorScale,
    flicker,
    rollDuration,
    rollOffset,
    rollIntervalMin,
    rollIntervalMax,
  };

  useEffect(() => {
    desiredOnRef.current = on;
    const a = powerAnimRef.current;
    const cur = evalPower(a.kf, performance.now() - a.start);
    if (on) {
      if (!imgLoadedRef.current) {
        powerAnimRef.current = { kf: [{ t: 0, p: 0 }], start: performance.now() };
        return;
      }
      const kf: PowerKF[] =
        cur < 0.05
          ? ON_KEYFRAMES
          : [
              { t: 0, p: cur },
              { t: Math.max(50, 700 * (1 - cur)), p: 1 },
            ];
      powerAnimRef.current = { kf, start: performance.now() };
    } else {
      powerAnimRef.current = {
        kf: [
          { t: 0, p: cur },
          { t: Math.max(50, 700 * cur), p: 0 },
        ],
        start: performance.now(),
      };
    }
  }, [on]);

  useEffect(() => {
    dirtyRef.current = true;
  }, [desktopIcons]);

  useEffect(() => {
    if (variant === "monitor") useCrt.getState().setCurve(curve);
  }, [curve, variant]);

  const findIconAtClient = (clientX: number, clientY: number): string | null => {
    const icons = iconsRef.current;
    if (!icons || !icons.length) return null;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const uvX = (clientX - rect.left) / rect.width;
    const uvY = 1 - (clientY - rect.top) / rect.height;
    const curve = settingsRef.current.curve;
    const cx = uvX * 2 - 1;
    const cy = uvY * 2 - 1;
    const ox = Math.abs(cy) / curve;
    const oy = Math.abs(cx) / curve;
    const tx = (cx + cx * ox * ox) * 0.5 + 0.5;
    const ty = (cy + cy * oy * oy) * 0.5 + 0.5;
    if (tx < 0 || tx > 1 || ty < 0 || ty > 1) return null;
    const px = tx * rect.width;
    const py = (1 - ty) * rect.height;
    for (const ic of icons) {
      if (px >= ic.x && px <= ic.x + ic.size && py >= ic.y && py <= ic.y + ic.size) {
        return ic.id;
      }
    }
    return null;
  };

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const id = findIconAtClient(e.clientX, e.clientY);
    if (id && onIconClickRef.current) onIconClickRef.current(id);
  };

  const onCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const id = findIconAtClient(e.clientX, e.clientY);
    if (hoveredIconIdRef.current !== id) {
      hoveredIconIdRef.current = id;
    }
  };

  const onCanvasMouseLeave = () => {
    if (hoveredIconIdRef.current !== null) hoveredIconIdRef.current = null;
  };

  useEffect(() => {
    let timer: number;
    const randomGap = () => {
      const s = settingsRef.current;
      const lo = Math.min(s.rollIntervalMin, s.rollIntervalMax);
      const hi = Math.max(s.rollIntervalMin, s.rollIntervalMax);
      return (lo + Math.random() * (hi - lo)) * 1000;
    };
    const fire = () => {
      rollStartRef.current = performance.now();
      const dur = settingsRef.current.rollDuration * 1000;
      timer = window.setTimeout(fire, dur + randomGap());
    };
    timer = window.setTimeout(fire, randomGap());
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: false,
      antialias: false,
    });
    if (!gl) {
      console.warn("[monitor] no webgl");
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("[monitor] link:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTex = gl.getUniformLocation(prog, "u_tex");
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uCurve = gl.getUniformLocation(prog, "u_curve");
    const uVignette = gl.getUniformLocation(prog, "u_vignette");
    const uScanline = gl.getUniformLocation(prog, "u_scanline");
    const uRollY = gl.getUniformLocation(prog, "u_rollY");
    const uRollWidth = gl.getUniformLocation(prog, "u_rollWidth");
    const uRollOffset = gl.getUniformLocation(prog, "u_rollOffset");
    const uPhosphor = gl.getUniformLocation(prog, "u_phosphor");
    const uPhosphorScale = gl.getUniformLocation(prog, "u_phosphorScale");
    const uFlicker = gl.getUniformLocation(prog, "u_flicker");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uPower = gl.getUniformLocation(prog, "u_power");

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(uTex, 0);

    const offCanvas = document.createElement("canvas");
    const offCtx = offCanvas.getContext("2d")!;

    let imgReady = false;
    dirtyRef.current = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgReady = true;
      imgLoadedRef.current = true;
      dirtyRef.current = true;
      if (desiredOnRef.current) {
        powerAnimRef.current = { kf: ON_KEYFRAMES, start: performance.now() };
      }
    };
    img.onerror = () => console.warn("[monitor] image load failed:", src);
    img.src = src;

    const iconImageCache = new Map<string, HTMLImageElement>();
    const ensureIconImage = (s: string) => {
      const cached = iconImageCache.get(s);
      if (cached) return cached;
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => {
        dirtyRef.current = true;
      };
      im.src = s;
      iconImageCache.set(s, im);
      return im;
    };

    let fontLink: HTMLLinkElement | null = null;
    if (taskbar) {
      const linkId = "__mtb_font_link";
      if (!document.getElementById(linkId)) {
        fontLink = document.createElement("link");
        fontLink.id = linkId;
        fontLink.rel = "stylesheet";
        fontLink.href = "https://fonts.googleapis.com/css2?family=VT323&display=swap";
        document.head.appendChild(fontLink);
      }
      if (document.fonts && (document.fonts as any).load) {
        document.fonts
          .load("20px VT323")
          .then(() => {
            dirtyRef.current = true;
          })
          .catch(() => {});
        document.fonts
          .load("20px LowresPixel")
          .then(() => {
            dirtyRef.current = true;
          })
          .catch(() => {});
      }
    }

    let clockTimer = 0;
    if (taskbar) {
      clockTimer = window.setInterval(() => {
        dirtyRef.current = true;
      }, 1000);
    }

    const compose = () => {
      if (!imgReady) return;
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) return;
      if (offCanvas.width !== w || offCanvas.height !== h) {
        offCanvas.width = w;
        offCanvas.height = h;
      }
      const S = Math.min(window.devicePixelRatio || 1, 2);
      offCtx.imageSmoothingEnabled = true;
      offCtx.drawImage(img, 0, 0, w, h);

      const icons = iconsRef.current;
      if (icons && icons.length) {
        offCtx.imageSmoothingEnabled = false;
        for (const ic of icons) {
          let src = ic.src;
          if (ic.frames && ic.frames.length) {
            const st = iconAnimRef.current.get(ic.id);
            const i = st ? Math.min(st.frameIndex, ic.frames.length - 1) : 0;
            src = ic.frames[i].src;
          }
          const im = ensureIconImage(src);
          if (!im.complete || im.naturalWidth === 0) continue;
          offCtx.drawImage(im, ic.x * S, ic.y * S, ic.size * S, ic.size * S);
        }
        offCtx.imageSmoothingEnabled = true;
        for (const ic of icons) {
          if (!ic.label) continue;
          const fontPx = Math.round(ic.size * 0.18);
          offCtx.font = `${fontPx * S}px 'LowresPixel', 'VT323', 'Courier New', monospace`;
          offCtx.textAlign = "center";
          offCtx.textBaseline = "top";
          offCtx.fillStyle = "rgba(0,0,0,0.7)";
          const cx = (ic.x + ic.size / 2) * S;
          const ty = (ic.y + ic.size + 6) * S;
          offCtx.fillText(ic.label, cx + 1 * S, ty + 1 * S);
          offCtx.fillStyle = "#F5F1E5";
          offCtx.fillText(ic.label, cx, ty);
        }
      }

      if (taskbar) {
        const tbH = 56 * S;
        drawTaskbar(offCtx, 0, h - tbH, w, tbH, S, new Date());
      }
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        offCanvas,
      );
      dirtyRef.current = false;
    };

    let rafId = 0;
    let lastW = 0;
    let lastH = 0;

    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      const w = Math.max(1, Math.floor(cssW * dpr));
      const h = Math.max(1, Math.floor(cssH * dpr));
      if (w !== lastW || h !== lastH) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        lastW = w;
        lastH = h;
        dirtyRef.current = true;
      }
      const nowMs = performance.now();
      const icons = iconsRef.current;
      if (icons && icons.length) {
        const hoverId = hoveredIconIdRef.current;
        for (const ic of icons) {
          if (!ic.frames || ic.frames.length === 0) continue;
          let st = iconAnimRef.current.get(ic.id);
          if (!st) {
            st = { hovered: false, frameIndex: 0, lastFrameStart: nowMs };
            iconAnimRef.current.set(ic.id, st);
          }
          const hov = hoverId === ic.id;
          if (hov !== st.hovered) {
            st.hovered = hov;
            if (!hov) {
              if (st.frameIndex !== 0) {
                st.frameIndex = 0;
                dirtyRef.current = true;
              }
            } else {
              st.lastFrameStart = nowMs;
            }
          }
          if (hov && st.frameIndex < ic.frames.length - 1) {
            const dur = ic.frames[st.frameIndex].ms;
            if (nowMs - st.lastFrameStart >= dur) {
              st.frameIndex++;
              st.lastFrameStart = nowMs;
              dirtyRef.current = true;
            }
          }
        }
      }
      if (dirtyRef.current) compose();

      const s = settingsRef.current;
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uCurve, s.curve);
      gl.uniform1f(uVignette, s.vignette);
      gl.uniform1f(uScanline, s.scanline);
      gl.uniform1f(uRollWidth, 0.002);
      gl.uniform1f(uRollOffset, s.rollOffset);
      gl.uniform1f(uPhosphor, s.phosphor);
      gl.uniform1f(uPhosphorScale, s.phosphorScale);
      gl.uniform1f(uFlicker, s.flicker);
      gl.uniform1f(uTime, performance.now() / 1000);
      const a = powerAnimRef.current;
      const power = evalPower(a.kf, performance.now() - a.start);
      gl.uniform1f(uPower, power);

      let rollY = 0;
      if (rollStartRef.current !== null) {
        const t = (performance.now() - rollStartRef.current) / 1000;
        const dur = Math.max(0.1, s.rollDuration);
        if (t < dur) {
          rollY = 1 - t / dur;
        } else {
          rollStartRef.current = null;
        }
      }
      gl.uniform1f(uRollY, rollY);

      if (imgReady) {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      if (clockTimer) window.clearInterval(clockTimer);
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [src, taskbar]);

  return (
    <canvas
      ref={canvasRef}
      onClick={onCanvasClick}
      onMouseMove={onCanvasMouseMove}
      onMouseLeave={onCanvasMouseLeave}
      className="w-full h-full block"
    />
  );
}
