export type MazeKind = "start" | "room" | "end";

export type MazeCell = {
  id: string;
  row: number;
  col: number;
  prompt: string;
  answer: number | null;
  kind: MazeKind;
};

export type MazeDoor = {
  to: string;
  value: number;
  correct: boolean;
};

export type MazeDef = {
  id: string;
  title: string;
  blurb: string;
  startId: string;
  cells: MazeCell[];
  doors: Record<string, MazeDoor[]>;
};

function cell(
  id: string,
  row: number,
  col: number,
  prompt: string,
  answer: number | null,
  kind: MazeKind = "room",
): MazeCell {
  return { id, row, col, prompt, answer, kind };
}

function doors(...pairs: Array<[string, number, boolean]>): MazeDoor[] {
  return pairs.map(([to, value, correct]) => ({ to, value, correct }));
}

export const MAZES: MazeDef[] = [
  {
    id: "div4",
    title: "Fosso do 4",
    blurb: "Dividir por 4. A porta certa é o quociente.",
    startId: "s",
    cells: [
      cell("s", 0, 0, "12 ÷ 4", 3, "start"),
      cell("a", 1, 0, "44 ÷ 4", 11),
      cell("b", 1, 1, "16 ÷ 4", 4),
      cell("c", 0, 1, "8 ÷ 4", 2),
      cell("d", 0, 2, "20 ÷ 4", 5),
      cell("e", 1, 2, "0 ÷ 4", 0),
      cell("f", 2, 2, "32 ÷ 4", 8),
      cell("g", 3, 2, "40 ÷ 4", 10),
      cell("h", 3, 3, "28 ÷ 4", 7),
      cell("z", 3, 4, "Fim", null, "end"),
    ],
    doors: {
      s: doors(["a", 3, true], ["c", 8, false], ["b", 2, false]),
      a: doors(["b", 10, false], ["s", 3, false], ["f", 11, true]),
      b: doors(["c", 4, true], ["e", 6, false], ["a", 10, false]),
      c: doors(["d", 2, true], ["b", 4, false], ["s", 8, false]),
      d: doors(["e", 5, true], ["c", 2, false], ["z", 16, false]),
      e: doors(["f", 0, true], ["d", 5, false], ["b", 6, false]),
      f: doors(["g", 8, true], ["e", 0, false], ["h", 11, false]),
      g: doors(["h", 10, true], ["f", 8, false], ["e", 9, false]),
      h: doors(["z", 7, true], ["g", 10, false], ["f", 4, false]),
    },
  },
  {
    id: "div3",
    title: "Vale do 3",
    blurb: "Dividir por 3. Sem relógio.",
    startId: "s",
    cells: [
      cell("s", 0, 0, "15 ÷ 3", 5, "start"),
      cell("a", 0, 1, "27 ÷ 3", 9),
      cell("b", 1, 1, "18 ÷ 3", 6),
      cell("c", 1, 0, "9 ÷ 3", 3),
      cell("d", 2, 0, "36 ÷ 3", 12),
      cell("e", 2, 1, "24 ÷ 3", 8),
      cell("f", 2, 2, "21 ÷ 3", 7),
      cell("z", 1, 2, "Fim", null, "end"),
    ],
    doors: {
      s: doors(["a", 5, true], ["c", 3, false], ["b", 12, false]),
      a: doors(["b", 9, true], ["s", 5, false], ["z", 7, false]),
      b: doors(["c", 6, true], ["a", 9, false], ["e", 4, false]),
      c: doors(["d", 3, true], ["b", 6, false], ["s", 15, false]),
      d: doors(["e", 12, true], ["c", 3, false], ["f", 9, false]),
      e: doors(["f", 8, true], ["d", 12, false], ["b", 6, false]),
      f: doors(["z", 7, true], ["e", 8, false], ["a", 4, false]),
    },
  },
  {
    id: "mul7",
    title: "Pico do 7",
    blurb: "Tabuada do 7. Cada porta é um produto.",
    startId: "s",
    cells: [
      cell("s", 0, 1, "7 × 3", 21, "start"),
      cell("a", 0, 2, "7 × 6", 42),
      cell("b", 1, 2, "7 × 8", 56),
      cell("c", 1, 1, "7 × 4", 28),
      cell("d", 1, 0, "7 × 9", 63),
      cell("e", 2, 0, "7 × 5", 35),
      cell("f", 2, 1, "7 × 7", 49),
      cell("z", 2, 2, "Fim", null, "end"),
    ],
    doors: {
      s: doors(["a", 21, true], ["c", 24, false], ["d", 14, false]),
      a: doors(["b", 42, true], ["s", 21, false], ["z", 48, false]),
      b: doors(["c", 56, true], ["a", 42, false], ["z", 63, false]),
      c: doors(["d", 28, true], ["b", 56, false], ["f", 32, false]),
      d: doors(["e", 63, true], ["c", 28, false], ["s", 27, false]),
      e: doors(["f", 35, true], ["d", 63, false], ["c", 30, false]),
      f: doors(["z", 49, true], ["e", 35, false], ["b", 56, false]),
    },
  },
  {
    id: "mix",
    title: "Cometa misturado",
    blurb: "Vezes e dividido, 6 a 9. O mais teimoso.",
    startId: "s",
    cells: [
      cell("s", 0, 0, "8 × 6", 48, "start"),
      cell("a", 0, 1, "54 ÷ 9", 6),
      cell("b", 0, 2, "7 × 8", 56),
      cell("c", 1, 2, "72 ÷ 8", 9),
      cell("d", 1, 1, "6 × 9", 54),
      cell("e", 1, 0, "63 ÷ 7", 9),
      cell("f", 2, 1, "9 × 8", 72),
      cell("z", 2, 2, "Fim", null, "end"),
    ],
    doors: {
      s: doors(["a", 48, true], ["e", 42, false], ["d", 14, false]),
      a: doors(["b", 6, true], ["s", 48, false], ["d", 8, false]),
      b: doors(["c", 56, true], ["a", 6, false], ["z", 64, false]),
      c: doors(["d", 9, true], ["b", 56, false], ["z", 8, false]),
      d: doors(["e", 54, true], ["c", 9, false], ["f", 36, false]),
      e: doors(["f", 9, true], ["d", 54, false], ["s", 7, false]),
      f: doors(["z", 72, true], ["e", 9, false], ["c", 81, false]),
    },
  },
];

export function mazeById(id: string): MazeDef {
  return MAZES.find((m) => m.id === id) ?? MAZES[0];
}

export function cellById(maze: MazeDef, id: string): MazeCell | undefined {
  return maze.cells.find((c) => c.id === id);
}
