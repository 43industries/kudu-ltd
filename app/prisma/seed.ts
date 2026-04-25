import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const badges = [
    {
      slug: "first-unlock",
      name: "First Step",
      description: "Solved your first level.",
      rarity: "COMMON" as const,
    },
    {
      slug: "ten-unlocks",
      name: "Digger",
      description: "Solved 10 levels across any rabbit holes.",
      rarity: "RARE" as const,
    },
    {
      slug: "fifty-unlocks",
      name: "Deep Diver",
      description: "Solved 50 levels. You are relentless.",
      rarity: "LEGENDARY" as const,
    },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: {},
      create: badge,
    });
    console.log(`✓ Badge: ${badge.name}`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
