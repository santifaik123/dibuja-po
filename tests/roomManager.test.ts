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

  it("starts a game, scores a correct guess and gives drawer bonus", () => {
    const manager = new RoomManager();
    const created = manager.createRoom("Santi", "socket-1");
    const joined = manager.joinRoom(created.room.code, "Cami", "socket-2");

    manager.startGame(created.room, created.player.id);

    const drawer = created.room.players.find(
      (player) => player.id === created.room.currentRound.drawerId,
    );
    const choice = created.room.currentRound.wordChoices[0]?.word ?? "";

    manager.chooseWord(created.room, drawer?.id ?? "", choice);

    const guesser = drawer?.id === created.player.id ? joined.player : created.player;
    const word = created.room.currentRound.word?.word;

    expect(word).toBeTruthy();

    const result = manager.addChatMessage(created.room, guesser.id, word ?? "");

    expect(result.accepted).toBe(true);
    expect(result.scoreEvents).toHaveLength(2);
    expect(guesser.score).toBe(100);
    expect(drawer?.score).toBe(40);
  });

  it("gives the drawer a bonus for every player who guesses", () => {
    const manager = new RoomManager();
    const created = manager.createRoom("Santi", "socket-1");
    const joined = manager.joinRoom(created.room.code, "Cami", "socket-2");
    const joinedSecond = manager.joinRoom(created.room.code, "Diego", "socket-3");

    manager.startGame(created.room, created.player.id);

    const drawer = created.room.players.find(
      (player) => player.id === created.room.currentRound.drawerId,
    );
    const choice = created.room.currentRound.wordChoices[0]?.word ?? "";

    manager.chooseWord(created.room, drawer?.id ?? "", choice);

    const guessers = [created.player, joined.player, joinedSecond.player].filter(
      (player) => player.id !== drawer?.id,
    );
    const word = created.room.currentRound.word?.word;

    const firstResult = manager.addChatMessage(created.room, guessers[0].id, word ?? "");
    const secondResult = manager.addChatMessage(created.room, guessers[1].id, word ?? "");

    expect(firstResult.scoreEvents).toEqual([
      { playerId: guessers[0].id, points: 100, reason: "first_guess" },
      { playerId: drawer?.id, points: 40, reason: "drawer_bonus" },
    ]);
    expect(secondResult.scoreEvents).toEqual([
      { playerId: guessers[1].id, points: 70, reason: "second_guess" },
      { playerId: drawer?.id, points: 30, reason: "drawer_bonus" },
    ]);
    expect(drawer?.score).toBe(70);
  });

  it("does not allow the drawer to score by typing the answer", () => {
    const manager = new RoomManager();
    const created = manager.createRoom("Santi", "socket-1");

    manager.joinRoom(created.room.code, "Cami", "socket-2");
    manager.startGame(created.room, created.player.id);

    const drawer = created.room.players.find(
      (player) => player.id === created.room.currentRound.drawerId,
    );
    const choice = created.room.currentRound.wordChoices[0]?.word ?? "";

    manager.chooseWord(created.room, drawer?.id ?? "", choice);

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

  it("starts rounds with word choices visible only to the drawer", () => {
    const manager = new RoomManager();
    const created = manager.createRoom("Santi", "socket-1");
    const joined = manager.joinRoom(created.room.code, "Cami", "socket-2");

    manager.startGame(created.room, created.player.id);

    const drawerId = created.room.currentRound.drawerId;
    const drawerState = manager.toClientState(created.room, drawerId);
    const guesserState = manager.toClientState(created.room, joined.player.id);

    expect(created.room.currentRound.status).toBe("choosing");
    expect(drawerState.currentRound.wordChoices).toHaveLength(3);
    expect(guesserState.currentRound.wordChoices).toHaveLength(0);
    expect(guesserState.currentRound.word).toBeNull();
  });
});
