import { useDesktop } from "../state/desktop";

// ============================================================
// TO REORDER: drag the lines below up/down.
// First line = first icon, last line = last icon.
// Comment after each ID is the display name (read-only).
// ============================================================
const ORDER: string[] = [
  "waiting-in-line",        // waiting in line for a blood sample
  "depleted-uranium",       // depleted uranium
  "arabic-alphabet",        // arabic alphabet
  "photbooth-session",      // photbooth session left behind by love birds and sausage dog
  "the-weed-my-mom-smelled",// the weed my mom smelled
  "the-magicians-trick",    // the magicians trick
  "cityscape",              // cityscape
  "girl-laughing",          // girl laughing
  "rockstar",               // rockstar
  "big-sis-little",         // big sis, little
  "dad",                    // dad
  "grandpa",                // grandpa
  "me",                     // me
  "mom",                    // mom
  "lauter-6357-copy",       // LAUTER_6357 copy
  "mathild-with-radish",    // mathild with radish
  "parachuter",             // parachuter
  "8teen",                  // 8TEEN (audio)
];

// ============================================================
// Per-entry metadata. Add/remove entries here. Order is set by ORDER above.
// ============================================================
type MementoMeta =
  | { kind: "image"; name: string; src: string }
  | { kind: "audio"; name: string; src: string };

const META: Record<string, MementoMeta> = {
  "8teen": { kind: "audio", name: "8TEEN", src: "/audio/8teen.mp3" },
  "arabic-alphabet": { kind: "image", name: "arabic alphabet", src: "/mementos/arabic-alphabet.jpg" },
  "big-sis-little": { kind: "image", name: "big sis, little", src: "/mementos/big-sis-little.jpg" },
  "cityscape": { kind: "image", name: "cityscape", src: "/mementos/cityscape.jpg" },
  "dad": { kind: "image", name: "dad", src: "/mementos/dad.jpg" },
  "depleted-uranium": { kind: "image", name: "depleted uranium", src: "/mementos/depleted-uranium.jpg" },
  "girl-laughing": { kind: "image", name: "girl laughing", src: "/mementos/girl-laughing.jpg" },
  "grandpa": { kind: "image", name: "grandpa", src: "/mementos/grandpa.jpg" },
  "lauter-6357-copy": { kind: "image", name: "LAUTER_6357 copy", src: "/mementos/lauter-6357-copy.jpg" },
  "mathild-with-radish": { kind: "image", name: "Mathilde with radish", src: "/mementos/mathild-with-radish.jpg" },
  "me": { kind: "image", name: "me", src: "/mementos/me.jpg" },
  "mom": { kind: "image", name: "mom", src: "/mementos/mom.jpg" },
  "parachuter": { kind: "image", name: "parachuter", src: "/mementos/parachuter.jpg" },
  "photbooth-session": { kind: "image", name: "photbooth session left behind by love birds and sausage dog", src: "/mementos/photbooth-session-left-behind-by-love-birds-and-sausage-dog.jpg" },
  "rockstar": { kind: "image", name: "rockstar", src: "/mementos/rockstar.jpg" },
  "the-magicians-trick": { kind: "image", name: "the magicians trick", src: "/mementos/the-magicians-trick.jpg" },
  "the-weed-my-mom-smelled": { kind: "image", name: "the weed my mom smelled", src: "/mementos/the-weed-my-mom-smelled.jpg" },
  "waiting-in-line": { kind: "image", name: "waiting in line for a blood sample", src: "/mementos/waiting-in-line-for-a-blood-sample.jpg" },
};

type Memento = MementoMeta & { id: string };

const ENTRIES: Memento[] = ORDER.map((id) => {
  const meta = META[id];
  if (!meta) throw new Error(`MementosPage: ORDER has unknown id "${id}"`);
  return { id, ...meta };
});

export const MEMENTO_IMAGES = ENTRIES.filter(
  (e): e is Extract<Memento, { kind: "image" }> => e.kind === "image",
);

const ICON_SRC = {
  image: "/images/icons/picture.png",
  audio: "/images/icons/audio.png",
};

export function MementosPage() {
  const openEntry = (entry: Memento) => {
    if (entry.kind === "image") {
      const index = MEMENTO_IMAGES.findIndex((e) => e.id === entry.id);
      useDesktop.getState().setViewer({
        src: entry.src,
        name: entry.name,
        index,
      });
      useDesktop.getState().open("image-viewer", {
        title: entry.name,
        x: 40,
        y: 20,
        w: 1128,
        h: 816,
      });
    } else {
      useDesktop.getState().setPlayer({ src: entry.src, name: entry.name });
      useDesktop.getState().open("audio-player", {
        title: entry.name,
        x: 280,
        y: 220,
        w: 576,
        h: 216,
      });
    }
  };

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex-1 overflow-auto">
        <ul className="grid grid-cols-4 gap-3">
          {ENTRIES.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className="w-full flex flex-col items-center gap-1 p-1 hover:bg-black/5"
                onDoubleClick={() => openEntry(entry)}
              >
                <img
                  src={ICON_SRC[entry.kind]}
                  alt=""
                  className="w-12 h-12"
                  style={{ imageRendering: "pixelated" }}
                  draggable={false}
                />
                <span className="text-[14px] text-center break-all leading-tight">
                  {entry.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
