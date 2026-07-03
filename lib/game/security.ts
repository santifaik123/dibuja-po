const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;
const MULTIPLE_SPACES = /\s+/g;
const NICKNAME_ALLOWED = /[^\p{L}\p{N} _.-]/gu;

export const MAX_NICKNAME_LENGTH = 18;
export const MAX_CHAT_MESSAGE_LENGTH = 160;

export function sanitizeNickname(nickname: string): string {
  return nickname
    .replace(CONTROL_CHARS, "")
    .replace(NICKNAME_ALLOWED, "")
    .replace(MULTIPLE_SPACES, " ")
    .trim()
    .slice(0, MAX_NICKNAME_LENGTH);
}

export function validateNickname(nickname: string): string | null {
  const clean = sanitizeNickname(nickname);

  if (!clean) {
    return "Escribe un nickname para entrar.";
  }

  if (clean.length < 2) {
    return "El nickname debe tener al menos 2 caracteres.";
  }

  return null;
}

export function sanitizeChatMessage(message: string): string {
  return message
    .replace(CONTROL_CHARS, "")
    .replace(MULTIPLE_SPACES, " ")
    .trim()
    .slice(0, MAX_CHAT_MESSAGE_LENGTH);
}

export function validateChatMessage(message: string): string | null {
  const clean = sanitizeChatMessage(message);

  if (!clean) {
    return "No puedes mandar mensajes vacios.";
  }

  return null;
}

export function normalizeRoomCode(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase();
}
