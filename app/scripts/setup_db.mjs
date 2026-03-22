import { readFileSync } from 'fs';
import pkg from 'pg';
const { Client } = pkg;
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupDatabase() {
  const connectionString = "postgresql://postgres:Whyt3m@ttr001]@db.jnjzovbteiuivdufnfkv.supabase.co:5432/postgres";
  
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL.");
    
    const sql = readFileSync(join(__dirname, 'setup.sql'), 'utf-8');
    console.log("Executing schema...");
    
    await client.query(sql);
    console.log("Schema applied successfully.");
  } catch (err) {
    console.error("Error executing schema:", err);
  } finally {
    await client.end();
  }
}

setupDatabase();
