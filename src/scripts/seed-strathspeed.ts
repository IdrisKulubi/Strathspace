#!/usr/bin/env tsx

import { seedIcebreakers } from '@/lib/strathspeed/seed-icebreakers';

async function main() {
  console.log('🚀 Starting StrathSpeed database seeding...');

  try {
    await seedIcebreakers();
    console.log('✅ StrathSpeed seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  main();
} 