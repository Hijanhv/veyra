import { Hono } from "hono";
import { db } from "ponder:api";
import schema from "ponder:schema";
import { graphql, client } from "ponder";

const app = new Hono();

// Expose GraphQL and SQL-over-HTTP for convenience
app.use("/graphql", graphql({ db, schema }));
app.use("/sql/*", client({ db, schema }));

export default app;

