import { useState } from "react";

type MementoFile = {
  id: string;
  type: "file";
  name: string;
  open: () => void;
};

type MementoFolder = {
  id: string;
  type: "folder";
  name: string;
  children: MementoEntry[];
};

type MementoEntry = MementoFile | MementoFolder;

const ROOT: MementoFolder = {
  id: "root",
  type: "folder",
  name: "MEMENTOS",
  children: [],
};

function findFolder(root: MementoFolder, path: string[]): MementoFolder {
  let cur: MementoFolder = root;
  for (const id of path) {
    const next = cur.children.find((c) => c.id === id && c.type === "folder");
    if (!next) return cur;
    cur = next as MementoFolder;
  }
  return cur;
}

export function MementosPage() {
  const [path, setPath] = useState<string[]>([]);
  const current = findFolder(ROOT, path);

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center gap-2 text-[14px] text-[#4A4538]">
        {path.length > 0 && (
          <button
            type="button"
            className="px-1.5 py-0.5 border border-[#3B362C] bg-[#F5F1E5] hover:bg-[#FFD93D] text-[#1A1A1A]"
            onClick={() => setPath((p) => p.slice(0, -1))}
          >
            ← back
          </button>
        )}
        <span className="break-all">/{path.join("/")}</span>
      </div>
      <div className="flex-1 overflow-auto">
        {current.children.length === 0 ? null : (
          <ul className="grid grid-cols-3 gap-3">
            {current.children.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className="w-full flex flex-col items-center gap-1 p-1 hover:bg-black/5"
                  onDoubleClick={() => {
                    if (entry.type === "folder") {
                      setPath((p) => [...p, entry.id]);
                    } else {
                      entry.open();
                    }
                  }}
                >
                  <img
                    src={entry.type === "folder" ? "/images/folder.webp" : "/images/folder.webp"}
                    alt=""
                    className="w-12 h-12"
                    style={{ imageRendering: "pixelated" }}
                    draggable={false}
                  />
                  <span className="text-[14px] text-center break-all">{entry.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
