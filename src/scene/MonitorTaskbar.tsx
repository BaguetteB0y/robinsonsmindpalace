import { useEffect, useState } from "react";

const FOLDER_ICON =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'><rect x='1' y='4' width='14' height='10' fill='%23E8C56A' stroke='%231A1A1A' stroke-width='1'/><rect x='1' y='3' width='6' height='2' fill='%23E8C56A' stroke='%231A1A1A' stroke-width='1'/></svg>";

const DISK_ICON =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'><rect x='1' y='1' width='14' height='14' fill='%234A4538' stroke='%231A1A1A' stroke-width='1'/><rect x='3' y='2' width='10' height='5' fill='%23B5B0A4'/><rect x='4' y='9' width='8' height='5' fill='%23B5B0A4'/><rect x='10' y='3' width='2' height='3' fill='%231A1A1A'/></svg>";

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');

.mtb {
  --topbar-height: 56px;
  --tb-bg-top:     #C8C4B8;
  --tb-bg-mid:     #B5B0A4;
  --tb-bg-low:     #8E897C;
  --tb-bg-edge:    #4A4538;
  --tab-bg-top:    #D8D4C8;
  --tab-bg-mid:    #BEB9AC;
  --tab-bg-low:    #9A9588;
  --tab-border:    #4A4538;
  --tab-active-top: #F0ECE0;
  --tab-active-mid: #DCD7C8;
  --tb-text:       #1A1A1A;
  --tb-text-soft:  #4A4538;
  --tb-accent:     #FFD93D;

  position: absolute;
  top: 0; left: 0; right: 0;
  height: var(--topbar-height);
  display: flex;
  align-items: stretch;
  z-index: 5;
  font-family: 'VT323', 'Press Start 2P', 'Courier New', monospace;
  color: var(--tb-text);
  user-select: none;
  background:
    linear-gradient(
      to bottom,
      var(--tb-bg-top)  0px,
      var(--tb-bg-top)  3px,
      var(--tb-bg-mid)  3px,
      var(--tb-bg-mid)  calc(100% - 6px),
      var(--tb-bg-low)  calc(100% - 6px),
      var(--tb-bg-low)  calc(100% - 2px),
      var(--tb-bg-edge) calc(100% - 2px),
      var(--tb-bg-edge) 100%
    );
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  pointer-events: none;
}
.mtb__brand {
  display: flex;
  align-items: center;
  padding: 0 22px 0 18px;
  gap: 4px;
  cursor: default;
  border-top-right-radius: 14px;
  border-bottom-right-radius: 14px;
  background:
    linear-gradient(
      to bottom,
      var(--tab-active-top) 0px,
      var(--tab-active-top) 4px,
      var(--tab-active-mid) 4px,
      var(--tab-active-mid) calc(100% - 6px),
      var(--tb-bg-low)      calc(100% - 6px),
      var(--tb-bg-low)      100%
    );
  border-right: 2px solid var(--tab-border);
}
.mtb__brand-name {
  font-family: 'Courier New', monospace;
  font-weight: 900;
  font-style: italic;
  font-size: 22px;
  letter-spacing: 0.5px;
  color: var(--tb-text);
}
.mtb__brand-suffix {
  font-size: 14px;
  font-weight: 700;
  vertical-align: super;
  color: var(--tb-text-soft);
  margin-left: 1px;
}
.mtb__items {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 8px;
  flex: 1;
  overflow: hidden;
}
.mtb__item {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: calc(100% - 8px);
  margin: 0 -6px 0 0;
  padding: 0 18px 0 14px;
  font-family: 'VT323', 'Courier New', monospace;
  font-size: 20px;
  color: var(--tb-text);
  border: none;
  border-radius: 14px;
  background:
    linear-gradient(
      to bottom,
      var(--tab-bg-top) 0px,
      var(--tab-bg-top) 3px,
      var(--tab-bg-mid) 3px,
      var(--tab-bg-mid) calc(100% - 4px),
      var(--tab-bg-low) calc(100% - 4px),
      var(--tab-bg-low) 100%
    );
  box-shadow: inset 0 0 0 1px var(--tab-border);
}
.mtb__item-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  image-rendering: pixelated;
}
.mtb__item-title { white-space: nowrap; }
.mtb__right {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 18px;
  margin-left: auto;
}
.mtb__clock {
  font-family: 'VT323', 'Courier New', monospace;
  font-size: 22px;
  font-weight: bold;
  color: var(--tb-text);
  letter-spacing: 1px;
  padding: 4px 10px;
  border-radius: 6px;
  background: transparent;
  min-width: 60px;
  text-align: center;
}
.mtb__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
}
.mtb__status svg {
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}
`;

function format24(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const ITEMS = [
  { id: "folder-1", title: "Folder", icon: FOLDER_ICON },
  { id: "folder-2", title: "Folder", icon: FOLDER_ICON },
  { id: "disk-1", title: "Disk", icon: DISK_ICON },
];

export function MonitorTaskbar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <style>{STYLE}</style>
      <div className="mtb">
        <div className="mtb__brand">
          <span className="mtb__brand-name">dreamweaver</span>
          <span className="mtb__brand-suffix">OS</span>
        </div>
        <div className="mtb__items">
          {ITEMS.map((it) => (
            <button key={it.id} type="button" className="mtb__item">
              <img className="mtb__item-icon" src={it.icon} alt="" />
              <span className="mtb__item-title">{it.title}</span>
            </button>
          ))}
        </div>
        <div className="mtb__right">
          <span className="mtb__clock">{format24(now)}</span>
          <span className="mtb__status" title="Status">
            <svg viewBox="0 0 16 16" shapeRendering="crispEdges" aria-label="Happy status">
              <circle cx="8" cy="8" r="7" fill="#FFD93D" stroke="#1A1A1A" strokeWidth="1" />
              <rect x="5" y="5" width="2" height="2" fill="#1A1A1A" />
              <rect x="9" y="5" width="2" height="2" fill="#1A1A1A" />
              <rect x="4" y="10" width="1" height="1" fill="#1A1A1A" />
              <rect x="5" y="11" width="1" height="1" fill="#1A1A1A" />
              <rect x="6" y="12" width="4" height="1" fill="#1A1A1A" />
              <rect x="10" y="11" width="1" height="1" fill="#1A1A1A" />
              <rect x="11" y="10" width="1" height="1" fill="#1A1A1A" />
            </svg>
          </span>
        </div>
      </div>
    </>
  );
}
