import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const employeeTemporaryPassword = await bcrypt.hash("Temporary@123", 10);
  const employeeActivationCode = await bcrypt.hash("WELCOME123", 10);

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

  await prisma.user.upsert({
    where: { email: "employee@company.com" },
    update: {
      employeeId: "EMP001",
      fullName: "Default Employee",
      role: "EMPLOYEE"
    },
    create: {
      email: "employee@company.com",
      employeeId: "EMP001",
      fullName: "Default Employee",
      passwordHash: employeeTemporaryPassword,
      activationCodeHash: employeeActivationCode,
      requiresActivation: true,
      role: "EMPLOYEE"
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
