# Dibuja Po

Dibuja Po es un juego web social para dibujar y adivinar palabras chilenas con amigos. El MVP usa salas privadas, turnos, chat, ranking, canvas en tiempo real y estado en memoria.

## Arquitectura de deploy elegida

**Opcion A: Railway en un solo servidor Node.**

- Next.js, Express y Socket.io corren en el mismo proceso.
- El backend sirve la app web y el WebSocket desde el mismo origen.
- No se usa `NEXT_PUBLIC_SOCKET_URL` en esta arquitectura.
- Railway inyecta `PORT`; el servidor escucha `process.env.PORT`.

Esta opcion es la mas simple para el MVP porque evita CORS entre frontend/backend separados y reduce puntos de falla.

## Stack

- Next.js + React + TypeScript.
- Tailwind CSS.
- Express + Socket.io.
- Canvas HTML5.
- Estado en memoria, sin base de datos.
- Vitest para pruebas de logica critica.

## Correr localmente

```bash
npm install
npm run dev
```

Abre:

```text
http://127.0.0.1:3000
```

El comando `npm run dev` levanta el servidor Express custom que sirve Next y Socket.io en el mismo puerto.

## Scripts

```bash
npm run dev        # desarrollo local
npm run build      # build Next.js
npm run start      # servidor production local/Railway
npm run typecheck  # TypeScript
npm run lint       # ESLint
npm test           # Vitest
```

## Variables de entorno

Copia `.env.example` si necesitas configurar variables locales.

```bash
cp .env.example .env
```

Variables:

- `PORT`: puerto del servidor. Railway lo define automaticamente.
- `CLIENT_URL`: opcional. Solo si el frontend vive en otro origen. Para Railway single-server se deja vacio.

No subas un `.env` real.

## Como jugar

1. Escribe tu nickname.
2. Crea una sala o entra con un codigo `CL-0000`.
3. Copia el codigo y mandaselo a tus amigos.
4. El host inicia la partida cuando hay minimo 2 jugadores.
5. El dibujante ve la palabra secreta y dibuja.
6. Los demas adivinan en el chat.
7. Si alguien acierta, sube el puntaje y cambia el turno.

## Crear sala

Desde la home:

1. Escribe `Tu nickname`.
2. Click en `Crear sala`.
3. Copia el codigo de sala desde el lobby.

## Unirse a sala

Desde la home:

1. Escribe `Tu nickname`.
2. Escribe el `Codigo de sala`.
3. Click en `Unirse`.

Tambien puedes abrir directamente `/room/CL-0000` y escribir tu nickname.

## Deploy en Railway

1. Sube el repo a GitHub.
2. Crea un nuevo proyecto en Railway desde ese repo.
3. Railway debe detectar Node/Nixpacks.
4. Usa estos comandos:

```bash
npm run build
npm run start
```

El archivo `railway.json` ya define:

- `buildCommand`: `npm run build`
- `startCommand`: `npm run start`

5. No configures `NEXT_PUBLIC_SOCKET_URL`.
6. Deja `CLIENT_URL` vacio si Railway sirve frontend y backend desde el mismo dominio.
7. Abre la URL publica de Railway y prueba crear/unirse a una sala.

## Probar produccion localmente

```bash
npm run build
npm run start
```

Luego abre `http://127.0.0.1:3000`.

## Problemas comunes

### Socket no conecta

- Revisa que el frontend y Socket.io esten en el mismo dominio.
- En la opcion Railway single-server no uses `NEXT_PUBLIC_SOCKET_URL`.
- Si separas frontend/backend en el futuro, configura `CLIENT_URL` con el dominio exacto del frontend.

### CORS

- En desarrollo se aceptan `http://127.0.0.1:3000` y `http://localhost:3000`.
- En produccion single-server no se necesita CORS especial.
- Si usas dominios separados, define `CLIENT_URL=https://tu-frontend.com`.

### Railway usa PORT

- Railway define `PORT` automaticamente.
- No hardcodees el puerto.
- El servidor ya usa `process.env.PORT`.

### Frontend apunta a localhost en produccion

- Esta arquitectura usa `io()` relativo al mismo origen.
- No configures `NEXT_PUBLIC_SOCKET_URL` para Railway single-server.

### Canvas no sincroniza

- Confirma que ambos jugadores esten en la misma sala.
- Solo el dibujante puede emitir eventos de dibujo.
- Si el servidor reinicia, la sala se pierde porque el estado vive en memoria.

### La sala se borra

- Es esperado: si todos salen, la sala se elimina de memoria.

### Mobile touch no dibuja

- Solo el dibujante puede dibujar.
- El canvas usa pointer events y `touch-action: none`.
- Si no dibuja, revisa que seas el dibujante actual.

## Archivos importantes

- `server/index.ts`: Express + Next + Socket.io.
- `server/socketHandlers.ts`: eventos Socket.io, timers y emision de estado.
- `lib/game/roomManager.ts`: salas, turnos, scoring, chat, canvas y desconexiones.
- `lib/game/normalizeAnswer.ts`: comparacion de respuestas.
- `lib/game/words.ts`: banco de palabras chilenas.
- `components/game/*`: UI del juego.
- `tests/*.test.ts`: pruebas de logica critica.

## Roadmap

- Persistir salas en Redis.
- Ranking historico en base de datos.
- Login opcional.
- Redis adapter para escalar Socket.io.
- Modo streamer.
- Emojis/reacciones.
- Votacion para expulsar jugadores.
- Moderacion de palabras.
- Observabilidad de errores y metricas de salas.
- Tests E2E multi-browser.

## Nota de seguridad

`npm audit --audit-level=high` debe pasar antes de deploy. `npm audit` puede reportar vulnerabilidades moderadas anidadas dentro de Next.js segun la version disponible. Mantener Next actualizado antes de produccion real.
