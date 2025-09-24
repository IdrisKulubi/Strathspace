'use server'

import db from "@/db/drizzle";
import { sql } from "drizzle-orm";

export async function checkMessagesTable() {
  try {
    console.log('🔍 Checking messages table structure...');
    
    // Check if table exists and get its structure
    const tableInfo = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'messages' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Messages table structure:', tableInfo.rows);
    
    // Check if gen_random_uuid function exists
    const uuidFunction = await db.execute(sql`
      SELECT EXISTS(
        SELECT 1 FROM pg_proc 
        WHERE proname = 'gen_random_uuid'
      ) as has_uuid_function;
    `);
    
    console.log('🔧 UUID function available:', uuidFunction.rows[0]);
    
    return {
      tableStructure: tableInfo.rows,
      hasUuidFunction: uuidFunction.rows[0]?.has_uuid_function
    };
    
  } catch (error) {
    console.error('❌ Database check error:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}