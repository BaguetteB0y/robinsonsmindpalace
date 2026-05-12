import { CSSProperties, ReactNode } from "react";

const STYLE_ID = "__crt_panel_keyframes";

function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
@keyframes crtPanelFlicker {
  0%, 100% { opacity: 1; }
  18% { opacity: 0.985; }
  37% { opacity: 0.97; }
  52% { opacity: 1; }
  74% { opacity: 0.99; }
  88% { opacity: 0.96; }
}
`;
  document.head.appendChild(s);
}

type Props = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function CRTPanel({ children, className, style }: Props) {
  ensureKeyframes();

  return (
    <div
      className={className}
      style={{
        position: "relative",
        isolation: "isolate",
        animation: "crtPanelFlicker 0.18s steps(1) infinite",
        ...style,
      }}
    >
      {children}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 1px, rgba(0,0,0,0) 1px 3px)",
          mixBlendMode: "multiply",
          zIndex: 2,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,90,90,0.13) 0 1px, rgba(90,255,90,0.13) 1px 2px, rgba(90,90,255,0.13) 2px 3px)",
          mixBlendMode: "multiply",
          zIndex: 3,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)",
          zIndex: 4,
        }}
      />
    </div>
  );
}
