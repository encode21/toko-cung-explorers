export type PrologStep =
  "meet" | "book" | "reveal" | "map" | "path" | "goal" | "finish" | "done" | "legacy";
export interface PrologData {
  enabled: true;
  version: number;
  step: PrologStep;
  completedAt: string | null;
  guest: boolean;
  path: "dagang" | "jalanan" | null;
  goal: {
    kind: "open" | "restock" | "serve" | "trip";
    progress: number;
    target: number;
    done: boolean;
  };
  koko: { x: number; y: number; z: number; radius: number };
  reveal: {
    seconds: number;
    from: [number, number, number];
    to: [number, number, number];
    lookAt: [number, number, number];
    labels: string[];
  };
  text: Record<string, string>;
  startCash: number;
  pollSeconds: number;
  stamps: string[];
}
export type PrologSnapshot = PrologData | { enabled: false };
export interface PrologCommand {
  action: "state" | "advance" | "choose-path";
  requestId: string;
  step?: PrologStep;
  path?: "dagang" | "jalanan";
}
