import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Historical data recovered from the original "suivi-presences" app (Upstash-backed,
// no git history). Only real August 2026 attendance exceptions are imported -- the
// September fields in that export were empty or placeholder test content.
const EMPLOYEE_NAMES = [
  "Eric - Petit", "Dadah", "Raymond", "Pinard", "Blaise", "Tahina", "Junior",
  "Setah", "Loigis", "Gros-Bras", "Homy", "Haja", "Ton",
];

const AUGUST_EXCEPTIONS: Record<string, Record<string, string>> = {
  "2026-08-03": { "Tahina": "ABS", "Loigis": "ABS", "Homy": "ABS" },
  "2026-08-04": { "Tahina": "ABS" },
  "2026-08-06": { "Blaise": "ABS", "Ton": "ABS", "Loigis": "DEMIE-J", "Tahina": "DEMIE-J", "Homy": "DEMIE-J" },
  "2026-08-07": Object.fromEntries(EMPLOYEE_NAMES.map((n) => [n, "OFF"])),
  "2026-08-12": { "Setah": "ABS", "Gros-Bras": "ABS" },
  "2026-08-17": { "Dadah": "ABS" },
  "2026-08-18": { "Dadah": "ABS" },
  "2026-08-20": Object.fromEntries(EMPLOYEE_NAMES.map((n) => [n, "OFF"])),
  "2026-08-21": Object.fromEntries(EMPLOYEE_NAMES.map((n) => [n, "OFF"])),
  "2026-08-24": Object.fromEntries(EMPLOYEE_NAMES.map((n) => [n, "OFF"])),
  "2026-08-25": Object.fromEntries(EMPLOYEE_NAMES.map((n) => [n, "OFF"])),
  "2026-08-26": Object.fromEntries(EMPLOYEE_NAMES.map((n) => [n, "OFF"])),
  "2026-08-27": { "Pinard": "ABS", "Homy": "ABS" },
  "2026-08-31": { "Tahina": "ABS", "Loigis": "ABS", "Setah": "ABS" },
};

const SEED_CREATED_BY = "seed-attendance-import";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const employeesByName = new Map<string, string>();
  for (const name of EMPLOYEE_NAMES) {
    const existing = await prisma.employee.findFirst({ where: { name } });
    const employee = existing ?? (await prisma.employee.create({ data: { name, createdBy: SEED_CREATED_BY } }));
    employeesByName.set(name, employee.id);
  }
  console.log(`Employees ready: ${employeesByName.size}`);

  let recordCount = 0;
  for (const [date, statuses] of Object.entries(AUGUST_EXCEPTIONS)) {
    for (const [name, status] of Object.entries(statuses)) {
      const employeeId = employeesByName.get(name);
      if (!employeeId) continue;
      await prisma.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId, date } },
        update: { status, createdBy: SEED_CREATED_BY },
        create: { employeeId, date, status, createdBy: SEED_CREATED_BY },
      });
      recordCount++;
    }
  }
  console.log(`Attendance records imported: ${recordCount}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
