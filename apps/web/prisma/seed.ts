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

  const demoEmployee = await prisma.user.findFirst({
    where: {
      OR: [{ email: "employee@company.com" }, { employeeId: "EMP001" }]
    }
  });

  if (!demoEmployee) {
    await prisma.user.create({
      data: {
        email: "employee@company.com",
        employeeId: "EMP001",
        fullName: "Default Employee",
        passwordHash: employeeTemporaryPassword,
        activationCodeHash: employeeActivationCode,
        requiresActivation: true,
        role: "EMPLOYEE"
      }
    });
  } else if (demoEmployee.requiresActivation && !demoEmployee.activationCodeHash) {
    await prisma.user.update({
      where: { id: demoEmployee.id },
      data: { activationCodeHash: employeeActivationCode }
    });
  }
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
