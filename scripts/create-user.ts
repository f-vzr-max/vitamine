import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      out[arg.slice(2)] = argv[i + 1];
      i++;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { email, name } = args;
  const passwordEnvVar = args["password-env"];

  if (!email || !name || !passwordEnvVar) {
    console.error(
      "Usage: npx tsx scripts/create-user.ts --email <email> --name <name> --password-env <ENV_VAR_NAME>"
    );
    process.exit(1);
  }

  const password = process.env[passwordEnvVar];
  if (!password) {
    console.error(`Environment variable ${passwordEnvVar} is not set or empty.`);
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const passwordHash = await bcrypt.hash(password, 10);

  // upsert: re-running with a new password doubles as the password-reset path (A2).
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash },
  });

  console.log(`User ready: ${user.email} (${user.id})`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
