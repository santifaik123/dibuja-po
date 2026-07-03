"use client";

import { Brush, Send } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/game/security";
import type { ChatMessage, Player } from "@/lib/game/types";

export function ChatPanel({
  messages,
  self,
  disabled,
  isDrawer,
  isChoosing,
  drawerName,
  onSendMessage,
}: {
  messages: ChatMessage[];
  self: Player | null;
  disabled: boolean;
  isDrawer: boolean;
  isChoosing: boolean;
  drawerName: string | null;
  onSendMessage: (message: string) => void;
}) {
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputDisabled = disabled || isChoosing;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = message.trim();

    if (!clean || inputDisabled) {
      return;
    }

    onSendMessage(clean);
    setMessage("");
  }

  return (
    <section className="classic-panel flex min-h-[420px] flex-col overflow-hidden bg-panel lg:h-[calc(100vh-125px)] lg:max-h-[720px]">
      <div className="flex min-h-[64px] items-center gap-3 border-b border-slate-200 bg-gradient-to-b from-white to-[#eeeeee] px-4">
        <Brush className="h-5 w-5 shrink-0 rounded-full bg-gameOrange p-0.5 text-white" />
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-black text-gameOrange">
            {drawerName
              ? isChoosing
                ? `${drawerName} elige palabra`
                : `${drawerName} va a dibujar`
              : "Esperando dibujante"}
          </h2>
          <p className="text-xs font-bold text-slate-500">
            {self ? `Tu nick: ${self.nickname}` : "Conectando jugador..."}
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="mt-2 rounded border border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-bold text-slate-500">
            Los mensajes y aciertos apareceran aqui.
          </div>
        ) : (
          messages.map((chatMessage) => <ChatBubble key={chatMessage.id} message={chatMessage} />)
        )}
      </div>

      <form onSubmit={submit} className="border-t border-[#d8d28b] bg-white p-3">
        <div className="flex gap-2">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value.slice(0, MAX_CHAT_MESSAGE_LENGTH))}
            maxLength={MAX_CHAT_MESSAGE_LENGTH}
            disabled={inputDisabled}
            placeholder={
              inputDisabled && !isChoosing
                ? "Espera conexion..."
                : isChoosing
                  ? "Espera que el dibujante elija..."
                  : isDrawer
                  ? "Puedes chatear, pero no soplar la palabra."
                  : "Escribe tu respuesta..."
            }
            className="h-8 min-w-0 flex-1 rounded-none border-2 border-[#cfc77b] bg-gameCream px-2 text-sm font-bold text-slate-900 outline-none transition focus:border-gameOrange disabled:bg-slate-100 disabled:text-slate-500"
          />
          <button
            type="submit"
            disabled={inputDisabled || !message.trim()}
            className="inline-flex h-8 w-9 shrink-0 items-center justify-center rounded bg-gameOrange text-white transition hover:bg-[#d6551f] disabled:bg-slate-200 disabled:text-slate-500"
            title="Enviar"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1 text-right text-[10px] font-bold text-slate-400">
          {message.length}/{MAX_CHAT_MESSAGE_LENGTH}
        </div>
      </form>
    </section>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.kind === "player") {
    return (
      <div className="rounded-xl bg-slate-50 px-3 py-2">
        <div className="mb-0.5 text-xs font-black text-gameBlueDark">{message.nickname}</div>
        <p className="break-words text-sm leading-5 text-slate-800">{message.text}</p>
      </div>
    );
  }

  if (message.kind === "system") {
    return <div className="px-2 py-1 text-xs font-bold leading-4 text-slate-500">{message.text}</div>;
  }

  const style =
    message.kind === "correct"
      ? "border-green-200 bg-green-50 text-green-800"
      : message.kind === "near"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-red-200 bg-red-50 text-red-800";

  return (
    <div className={`rounded-lg border px-3 py-2 text-sm font-bold leading-5 ${style}`}>
      {message.text}
    </div>
  );
}
