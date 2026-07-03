import { createServer } from "node:http";
import express from "express";
import next from "next";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socketHandlers";

const port = Number(process.env.PORT ?? 3000);
const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST ?? (dev ? "127.0.0.1" : "0.0.0.0");
const clientOrigins = process.env.CLIENT_URL?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOptions =
  dev || (clientOrigins && clientOrigins.length > 0)
    ? {
        origin: dev ? ["http://127.0.0.1:3000", "http://localhost:3000"] : clientOrigins,
        credentials: true,
      }
    : undefined;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const expressApp = express();
const httpServer = createServer(expressApp);
const io = new Server(httpServer, {
  cors: corsOptions,
  maxHttpBufferSize: 32_000,
});

registerSocketHandlers(io);

expressApp.get("/health", (_request, response) => {
  response.json({ ok: true, name: "Dibuja Po" });
});

expressApp.all("*", (request, response) => {
  return handle(request, response);
});

httpServer.listen(port, hostname, () => {
  const displayHost = hostname === "0.0.0.0" ? "127.0.0.1" : hostname;
  console.log(`Dibuja Po listo en http://${displayHost}:${port}`);
});
