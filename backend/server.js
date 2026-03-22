/**
 * server.js — Entry point
 * Starts the HTTP server. Nothing else lives here.
 */
import app        from "./app.js";
import { PORT }   from "./config/constants.js";

app.listen(PORT, () => {
  console.log(`✅  Server running → http://localhost:${PORT}`);
});