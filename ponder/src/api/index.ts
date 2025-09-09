import { Hono } from "hono";
import { db } from "ponder:api";
import { graphql, client } from "ponder";
import { eq, desc, and } from "ponder";
import schema from "ponder:schema";

const app = new Hono();

app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));
app.use("/sql/*", client({ db, schema }));

// Vault flows (deposits + withdrawals)
app.get("/vaults/:vault/flows", async (c) => {
  const vault = c.req.param("vault").toLowerCase() as `0x${string}`;
  const limit = Math.max(1, Math.min(200, parseInt(c.req.query("limit") ?? "50")));
  const offset = Math.max(0, parseInt(c.req.query("offset") ?? "0"));
  
  try {
    const size = Math.max(1, limit + offset);
    
    // Fetch deposits
    const deposits = await db
      .select()
      .from(schema.deposits)
      .where(eq(schema.deposits.vault, vault))
      .orderBy(desc(schema.deposits.timestamp))
      .limit(size);

    // Fetch withdrawals
    const withdrawals = await db
      .select()
      .from(schema.withdrawals)
      .where(eq(schema.withdrawals.vault, vault))
      .orderBy(desc(schema.withdrawals.timestamp))
      .limit(size);

    // Map deposits
    const depositsMapped = deposits.map((r) => ({
      id: r.id,
      vault: r.vault,
      action: "deposit" as const,
      sender: r.sender,
      owner: r.owner,
      receiver: null,
      assets: r.assets.toString(),
      shares: r.shares.toString(),
      blockNumber: Number(r.blockNumber),
      timestamp: Number(r.timestamp),
      transactionHash: r.transactionHash,
    }));

    // Map withdrawals
    const withdrawalsMapped = withdrawals.map((r) => ({
      id: r.id,
      vault: r.vault,
      action: "withdrawal" as const,
      sender: r.sender,
      owner: r.owner,
      receiver: r.receiver,
      assets: r.assets.toString(),
      shares: r.shares.toString(),
      blockNumber: Number(r.blockNumber),
      timestamp: Number(r.timestamp),
      transactionHash: r.transactionHash,
    }));

    // Merge, sort, and paginate
    const merged = [...depositsMapped, ...withdrawalsMapped];
    merged.sort((a, b) => b.timestamp - a.timestamp);
    const items = merged.slice(offset, offset + limit);
    
    return c.json({
      success: true,
      data: {
        items,
        nextOffset: offset + items.length,
        hasMore: items.length === limit,
      },
    });
  } catch (error) {
    console.error("Error fetching flows:", error);
    return c.json({ success: false, error: "Failed to fetch flows" }, 500);
  }
});

// Vault rebalances
app.get("/vaults/:vault/rebalances", async (c) => {
  const vault = c.req.param("vault").toLowerCase() as `0x${string}`;
  const limit = Math.max(1, Math.min(200, parseInt(c.req.query("limit") ?? "50")));
  const offset = Math.max(0, parseInt(c.req.query("offset") ?? "0"));

  try {
    const result = await db
      .select()
      .from(schema.rebalances)
      .where(eq(schema.rebalances.vault, vault))
      .orderBy(desc(schema.rebalances.timestamp))
      .limit(limit)
      .offset(offset);

    const items = result.map((r) => ({
      id: r.id,
      vault: r.vault,
      strategies: r.strategies,
      allocations: r.allocations.map((a) => a.toString()),
      blockNumber: Number(r.blockNumber),
      timestamp: Number(r.timestamp),
      transactionHash: r.transactionHash,
    }));

    return c.json({
      success: true,
      data: {
        items,
        nextOffset: offset + items.length,
        hasMore: items.length === limit,
      },
    });
  } catch (error) {
    console.error("Error fetching rebalances:", error);
    return c.json({ success: false, error: "Failed to fetch rebalances" }, 500);
  }
});

// Vault harvests
app.get("/vaults/:vault/harvests", async (c) => {
  const vault = c.req.param("vault").toLowerCase() as `0x${string}`;
  const limit = Math.max(1, Math.min(200, parseInt(c.req.query("limit") ?? "50")));
  const offset = Math.max(0, parseInt(c.req.query("offset") ?? "0"));

  try {
    const result = await db
      .select()
      .from(schema.yieldHarvests)
      .where(eq(schema.yieldHarvests.vault, vault))
      .orderBy(desc(schema.yieldHarvests.timestamp))
      .limit(limit)
      .offset(offset);

    const items = result.map((r) => ({
      id: r.id,
      vault: r.vault,
      totalYield: r.totalYield.toString(),
      blockNumber: Number(r.blockNumber),
      timestamp: Number(r.timestamp),
      transactionHash: r.transactionHash,
    }));

    return c.json({
      success: true,
      data: {
        items,
        nextOffset: offset + items.length,
        hasMore: items.length === limit,
      },
    });
  } catch (error) {
    console.error("Error fetching harvests:", error);
    return c.json({ success: false, error: "Failed to fetch harvests" }, 500);
  }
});

// Strategy events
app.get("/vaults/:vault/strategy-events", async (c) => {
  const vault = c.req.param("vault").toLowerCase() as `0x${string}`;
  const limit = Math.max(1, Math.min(200, parseInt(c.req.query("limit") ?? "50")));
  const offset = Math.max(0, parseInt(c.req.query("offset") ?? "0"));
  const type = c.req.query("type") as "deposit" | "withdrawal" | "allocation_updated" | undefined;

  try {
    const whereClause = type
      ? and(eq(schema.strategyEvents.vault, vault), eq(schema.strategyEvents.eventType, type))
      : eq(schema.strategyEvents.vault, vault);

    const result = await db
      .select()
      .from(schema.strategyEvents)
      .where(whereClause)
      .orderBy(desc(schema.strategyEvents.timestamp))
      .limit(limit + 1)
      .offset(offset);

    const sliced = result.slice(0, limit);
    const items = sliced.map((r) => ({
      id: r.id,
      vault: r.vault,
      strategy: r.strategy,
      eventType: r.eventType,
      amount: r.amount?.toString() ?? null,
      allocation: r.allocation?.toString() ?? null,
      blockNumber: Number(r.blockNumber),
      timestamp: Number(r.timestamp),
      transactionHash: r.transactionHash,
    }));

    return c.json({
      success: true,
      data: {
        items,
        nextOffset: offset + items.length,
        hasMore: result.length > limit,
      },
    });
  } catch (error) {
    console.error("Error fetching strategy events:", error);
    return c.json({ success: false, error: "Failed to fetch strategy events" }, 500);
  }
});

export default app; 