/**
 * app.js — Express application
 * Wires up middleware, routes, and error handlers.
 * Kept separate from server.js so the app can be tested without starting a port.
 */
import express from "express";
import cors from "cors";
import videoRoutes from "./routes/video.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173", // local dev
  "https://your-frontend-on-vercel.app", // production
];

app.use(
  cors({
    origin: (origin, callback) => {
        
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
  }),
);

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/", videoRoutes);

// ── Error handlers (must be last) ────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
