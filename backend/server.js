/**
 * server.js — Entry point
 * Starts the HTTP server. Nothing else lives here.
 */
import "dotenv/config";   // must be first line
import app from "./app.js";
import { PORT } from "./config/constants.js";

app.listen(PORT, () => {
  console.log(`✅  Server running → http://localhost:${PORT}`);
});
