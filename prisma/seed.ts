import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const SYSTEM = "seed";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  await prisma.liquidationConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", vracBaselineBales: 4200, prePressedStockBales: 0 },
  });

  const articleNames = [
    "T-shirts homme",
    "T-shirts femme",
    "Pantalons",
    "Robes",
    "Chemises",
    "Vestes",
    "Jeans",
    "Shorts",
    "Pulls",
    "Manteaux",
  ];
  for (const name of articleNames) {
    await prisma.article.upsert({
      where: { id: `seed-article-${name}` },
      update: {},
      create: { id: `seed-article-${name}`, name, priceArBalle: 0, stock: 0, createdBy: SYSTEM },
    });
  }

  for (let i = 1; i <= 13; i++) {
    await prisma.employee.upsert({
      where: { id: `seed-employee-${i}` },
      update: {},
      create: { id: `seed-employee-${i}`, name: `Employé ${i}`, createdBy: SYSTEM },
    });
  }

  console.log("Seed complete.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
