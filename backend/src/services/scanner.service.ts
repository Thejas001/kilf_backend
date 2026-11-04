import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { hashPassword } from '../utils/password';
import { toAdminDto } from './auth.service';

export async function listScanners() {
  const scanners = await prisma.admin.findMany({
    where: { role: 'SCANNER' },
    orderBy: { createdAt: 'desc' },
  });
  return scanners.map(toAdminDto);
}

export async function createScanner(input: { name: string; email: string; password: string }) {
  try {
    const scanner = await prisma.admin.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: await hashPassword(input.password),
        role: 'SCANNER',
      },
    });
    return toAdminDto(scanner);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw ApiError.conflict('An account with this email already exists');
    }
    throw err;
  }
}

export async function updateScanner(
  id: string,
  input: { name?: string; isActive?: boolean; password?: string }
) {
  const existing = await prisma.admin.findFirst({ where: { id, role: 'SCANNER' } });
  if (!existing) throw ApiError.notFound('Scanner not found');

  const data: Prisma.AdminUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.password !== undefined) data.passwordHash = await hashPassword(input.password);
  // A new password or a deactivation signs the device out.
  if (input.password !== undefined || input.isActive === false) data.refreshTokenHash = null;

  return toAdminDto(await prisma.admin.update({ where: { id }, data }));
}
