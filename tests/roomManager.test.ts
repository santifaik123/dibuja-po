import { describe, expect, it } from "vitest";
import { RoomManager } from "@/lib/game/roomManager";

describe("RoomManager", () => {
  it("creates and joins rooms with sanitized nicknames", () => {
    const manager = new RoomManager();
    const created = manager.createRoom("  Santi<script>  ", "socket-1");
    const joined = manager.joinRoom(created.room.code, "Cami", "socket-2");

    expect(created.room.code).toMatch(/^CL-\d{4}$/);
    expect(created.player.nickname).toBe("Santiscript");
    expect(joined.player.isHost).toBe(false);
    expect(created.room.players).toHaveLength(2);
  });

  it("rejects duplicate connected nicknames in the same room", () => {
    const manager = new RoomManager();
    const created = manager.createRoom("Santi", "socket-1");

    manager.joinRoom(created.room.code, "Cami", "socket-2");

    expect(() => manager.joinRoom(created.room.code, "cami", "socket-3")).toThrow(
      "Ese nickname ya esta usado en esta sala.",
    );
  });

  it("starts a game, scores a correct guess and gives one drawer bonus", () => {
    const manager = new RoomManager();
    const created = manager.createRoom("Santi", "socket-1");
    const joined = manager.joinRoom(created.room.code, "Cami", "socket-2");

    manager.startGame(created.room, created.player.id);

    const drawer = created.room.players.find(
      (player) => player.id === created.room.currentRound.drawerId,
    );
    const guesser = drawer?.id === created.player.id ? joined.player : created.player;
    const word = created.room.currentRound.word?.word;

    expect(word).toBeTruthy();

    const result = manager.addChatMessage(created.room, guesser.id, word ?? "");

    expect(result.accepted).toBe(true);
    expect(result.scoreEvents).toHaveLength(2);
    expect(guesser.score).toBe(100);
    expect(drawer?.score).toBe(50);
  });

  it("does not allow the drawer to score by typing the answer", () => {
    const manager = new RoomManager();
    const created = manager.createRoom("Santi", "socket-1");

    manager.joinRoom(created.room.code, "Cami", "socket-2");
    manager.startGame(created.room, created.player.id);

    const drawer = created.room.players.find(
      (player) => player.id === created.room.currentRound.drawerId,
    );
    const word = created.room.currentRound.word?.word;
    const result = manager.addChatMessage(created.room, drawer?.id ?? "", word ?? "");

    expect(result.accepted).toBe(false);
    expect(result.privateError).toBe("El dibujante no puede responder la palabra.");
    expect(drawer?.score).toBe(0);
  });

  it("transfers host when host disconnects", () => {
    const manager = new RoomManager();
    const created = manager.createRoom("Santi", "socket-1");
    const joined = manager.joinRoom(created.room.code, "Cami", "socket-2");
    const result = manager.disconnectSocket("socket-1");

    expect(result.hostChanged).toBe(true);
    expect(result.room?.hostId).toBe(joined.player.id);
    expect(joined.player.isHost).toBe(true);
  });

  it("flags drawer disconnection without deleting an occupied room", () => {
    const manager = new RoomManager();
    const created = manager.createRoom("Santi", "socket-1");

    manager.joinRoom(created.room.code, "Cami", "socket-2");
    manager.joinRoom(created.room.code, "Diego", "socket-3");
    manager.startGame(created.room, created.player.id);

    const drawer = created.room.players.find(
      (player) => player.id === created.room.currentRound.drawerId,
    );
    const result = manager.disconnectSocket(drawer?.socketId ?? "");

    expect(result.roomDeleted).toBe(false);
    expect(result.drawerLeft).toBe(true);
  });
});
