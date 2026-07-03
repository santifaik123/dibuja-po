"use client";

import { useEffect, useRef } from "react";
import type { ClientRoomState } from "@/lib/game/types";

export function useGameSounds(room: ClientRoomState | null) {
  const previousRoundIdRef = useRef<string | null>(null);
  const previousStatusRef = useRef<string | null>(null);
  const previousCorrectMessageIdRef = useRef<string | null>(null);
  const previousSecondRef = useRef<number | null>(null);

  useEffect(() => {
    if (!room) {
      return;
    }

    const status = room.currentRound.status;
    const latestCorrectMessage = [...room.chatMessages]
      .reverse()
      .find((message) => message.kind === "correct");

    if (previousRoundIdRef.current && previousRoundIdRef.current !== room.currentRound.id) {
      playMelody([660, 880], 0.06, "triangle");
    }

    if (previousStatusRef.current !== status) {
      if (status === "choosing") {
        playTone(440, 0.08, "sine");
      }

      if (status === "drawing") {
        playMelody([520, 700, 920], 0.045, "triangle");
      }

      if (status !== "choosing" && status !== "drawing" && previousStatusRef.current) {
        playTone(220, 0.12, "sawtooth");
      }
    }

    if (
      latestCorrectMessage &&
      previousCorrectMessageIdRef.current &&
      latestCorrectMessage.id !== previousCorrectMessageIdRef.current
    ) {
      playMelody([740, 980, 1240], 0.05, "square");
    }

    if (
      status === "drawing" &&
      room.timeRemaining > 0 &&
      room.timeRemaining <= 5 &&
      previousSecondRef.current !== room.timeRemaining
    ) {
      playTone(360 + (6 - room.timeRemaining) * 70, 0.035, "square");
    }

    previousRoundIdRef.current = room.currentRound.id;
    previousStatusRef.current = status;
    previousCorrectMessageIdRef.current = latestCorrectMessage?.id ?? null;
    previousSecondRef.current = room.timeRemaining;
  }, [room]);
}

function playMelody(frequencies: number[], durationSeconds: number, type: OscillatorType) {
  frequencies.forEach((frequency, index) => {
    window.setTimeout(
      () => playTone(frequency, durationSeconds, type),
      index * durationSeconds * 1000,
    );
  });
}

function playTone(frequency: number, durationSeconds: number, type: OscillatorType) {
  try {
    const audioWindow = window as Window &
      typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = window.AudioContext ?? audioWindow.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + durationSeconds);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + durationSeconds);
    window.setTimeout(() => void audioContext.close(), (durationSeconds + 0.04) * 1000);
  } catch {
    // Browsers can block sound until the player interacts; gameplay must continue silently.
  }
}
