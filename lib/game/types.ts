export type RoomPhase = "lobby" | "playing" | "finished";

export type RoundStatus =
  | "waiting"
  | "choosing"
  | "drawing"
  | "guessed"
  | "timeout"
  | "drawer_left"
  | "skipped";

export type ChatMessageKind = "player" | "system" | "correct" | "near" | "error";

export type DrawEventType = "start" | "move" | "end";

export type DrawMode = "draw" | "erase";

export type WordCategory =
  | "Comida chilena"
  | "Lugares de Chile"
  | "Modismos chilenos"
  | "Objetos cotidianos"
  | "Cultura chilena"
  | "Carrete"
  | "Colegio/universidad"
  | "Tecnologia/startups"
  | "Deportes"
  | "Animales/cosas dibujables";

export interface Player {
  id: string;
  socketId: string | null;
  nickname: string;
  score: number;
  isHost: boolean;
  isConnected: boolean;
  hasGuessedCurrentRound: boolean;
  joinedAt: number;
}

export interface WordEntry {
  word: string;
  category: WordCategory;
}

export interface ChatMessage {
  id: string;
  kind: ChatMessageKind;
  text: string;
  playerId?: string;
  nickname?: string;
  createdAt: number;
}

export interface DrawPoint {
  x: number;
  y: number;
}

export interface DrawEvent {
  id: string;
  type: DrawEventType;
  point?: DrawPoint;
  color: string;
  size: number;
  mode: DrawMode;
  fromPlayerId: string;
  createdAt: number;
}

export interface ScoreEvent {
  playerId: string;
  points: number;
  reason: "first_guess" | "second_guess" | "later_guess" | "drawer_bonus";
}

export interface Round {
  id: string;
  number: number;
  turnIndex: number;
  drawerId: string | null;
  word: WordEntry | null;
  wordChoices: WordEntry[];
  status: RoundStatus;
  startedAt: number | null;
  endsAt: number | null;
  revealedWord: string | null;
  guessedPlayerIds: string[];
}

export interface Room {
  code: string;
  hostId: string | null;
  players: Player[];
  state: RoomPhase;
  turnOrder: string[];
  currentRound: Round;
  timeRemaining: number;
  hint: string;
  chatMessages: ChatMessage[];
  drawEvents: DrawEvent[];
  createdAt: number;
  updatedAt: number;
}

export interface ClientRoomState {
  code: string;
  hostId: string | null;
  players: Player[];
  state: RoomPhase;
  turnOrder: string[];
  currentRound: Omit<Round, "word"> & {
    word: WordEntry | null;
  };
  timeRemaining: number;
  hint: string;
  chatMessages: ChatMessage[];
  drawEvents: DrawEvent[];
  viewerId: string | null;
  isViewerDrawer: boolean;
}

export interface SocketAck<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface JoinRoomPayload {
  code: string;
  nickname: string;
  playerId?: string | null;
}

export interface CreateRoomPayload {
  nickname: string;
}

export interface ChatPayload {
  message: string;
}

export interface ChooseWordPayload {
  word: string;
}

export interface DrawPayload {
  x?: number;
  y?: number;
  color?: string;
  size?: number;
  mode?: DrawMode;
}

export interface RoomJoinResult {
  room: Room;
  player: Player;
  isReconnect: boolean;
}

export interface ChatResult {
  accepted: boolean;
  privateError?: string;
  messages: ChatMessage[];
  scoreEvents: ScoreEvent[];
  shouldEndRound: boolean;
}

export interface DisconnectResult {
  room: Room | null;
  player: Player | null;
  roomDeleted: boolean;
  hostChanged: boolean;
  drawerLeft: boolean;
  shouldPauseGame: boolean;
}
