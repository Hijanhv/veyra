#!/usr/bin/env node

import { Client } from 'pg';
import 'dotenv/config';

const schemaName = process.env.DATABASE_SCHEMA || 'veyra_indexer';

async function resetSchema() {
  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL not set, using local PGlite database');
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log(`Dropping schema '${schemaName}' if it exists...`);
    
    // Drop the schema if it exists (CASCADE will drop all objects in it)
    await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`);
    console.log(`Schema '${schemaName}' dropped successfully`);
    
  } catch (error) {
    console.error('Error resetting schema:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetSchema();