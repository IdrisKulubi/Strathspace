import { seedIcebreakers } from '../src/lib/strathspeed/seed-icebreakers.js';

async function main() {
  try {
    await seedIcebreakers();
    console.log('🎉 Icebreaker seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  }
}

main(); 