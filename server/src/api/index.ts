import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { client } from "ponder";

// Expose Ponder SQL over HTTP for clients (@ponder/client & @ponder/react)
// This app is served by the Ponder process on its port (default 42069).
// Start via: `pnpm --filter ./server indexer:dev` or `indexer:start`.
const app = new Hono();

app.use("/sql/*", client({ db, schema }));

export default app;
