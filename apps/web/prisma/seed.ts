import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("Admin@123", 10);

  await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: {
      employeeId: "ADM001",
      requiresActivation: false,
      activationCodeHash: null
    },
    create: {
      email: "admin@company.com",
      employeeId: "ADM001",
      fullName: "System Admin",
      passwordHash: adminPassword,
      requiresActivation: false,
      role: "ADMIN"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
