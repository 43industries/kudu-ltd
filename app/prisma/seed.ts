import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const badges = [
    {
      slug: "first-unlock",
      name: "First Step",
      description: "Solved your first level.",
      rarity: "COMMON" as const,
      iconUrl: "🐣",
    },
    {
      slug: "ten-unlocks",
      name: "Digger",
      description: "Solved 10 levels across any rabbit holes.",
      rarity: "RARE" as const,
      iconUrl: "⛏️",
    },
    {
      slug: "fifty-unlocks",
      name: "Deep Diver",
      description: "Solved 50 levels. You are relentless.",
      rarity: "LEGENDARY" as const,
      iconUrl: "🌀",
    },
    {
      slug: "first-hole",
      name: "Hole Digger",
      description: "Created your first rabbit hole.",
      rarity: "COMMON" as const,
      iconUrl: "🕳️",
    },
    {
      slug: "rabbit-master",
      name: "Rabbit Master",
      description: "Reached the highest rank.",
      rarity: "LEGENDARY" as const,
      iconUrl: "👑",
    },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: {},
      create: badge,
    });
    console.log(`✓ Badge: ${badge.iconUrl} ${badge.name}`);
  }

  console.log("\nSeed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
