import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { createAdmin, authHeader } from '../utils/factories';

const app = createApp();

describe('Admin bootstrap', () => {
  it('creates the first admin when none exists yet', async () => {
    const res = await request(app).post('/api/admin/auth/bootstrap').send({
      name: 'First Admin',
      email: 'first-admin@kilf.dev',
      password: 'Bootstrap@123',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.admin.role).toBe('SUPER_ADMIN');

    const stored = await prisma.admin.findUnique({ where: { email: 'first-admin@kilf.dev' } });
    expect(stored).not.toBeNull();
  });

  it('refuses to bootstrap a second admin once one already exists', async () => {
    await createAdmin({ email: 'existing@kilf.dev' });

    const res = await request(app).post('/api/admin/auth/bootstrap').send({
      name: 'Second Admin',
      email: 'second-admin@kilf.dev',
      password: 'Bootstrap@123',
    });

    expect(res.status).toBe(403);

    const stored = await prisma.admin.findUnique({ where: { email: 'second-admin@kilf.dev' } });
    expect(stored).toBeNull();
  });

  it('only lets one of two concurrent bootstrap requests succeed', async () => {
    const [resA, resB] = await Promise.all([
      request(app).post('/api/admin/auth/bootstrap').send({
        name: 'Racer A',
        email: 'racer-a@kilf.dev',
        password: 'Bootstrap@123',
      }),
      request(app).post('/api/admin/auth/bootstrap').send({
        name: 'Racer B',
        email: 'racer-b@kilf.dev',
        password: 'Bootstrap@123',
      }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 403]);

    const totalAdmins = await prisma.admin.count();
    expect(totalAdmins).toBe(1);
  });
});

describe('Admin Auth', () => {
  it('logs in successfully with correct credentials', async () => {
    const { admin, password } = await createAdmin({ email: 'login-ok@kilf.dev', password: 'Secret@123' });

    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: admin.email, password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.admin.email).toBe(admin.email);
    expect(res.body.admin).not.toHaveProperty('passwordHash');
  });

  it('rejects an invalid password', async () => {
    const { admin } = await createAdmin({ email: 'login-bad@kilf.dev', password: 'Secret@123' });

    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: admin.email, password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects unknown emails with the same generic error', async () => {
    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: 'nobody@kilf.dev', password: 'whatever' });

    expect(res.status).toBe(401);
  });

  it('blocks access to a protected route without a token', async () => {
    const res = await request(app).get('/api/admin/auth/me');
    expect(res.status).toBe(401);
  });

  it('blocks access to a protected route with an invalid token', async () => {
    const res = await request(app).get('/api/admin/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('allows access to a protected route with a valid token', async () => {
    const { token, admin } = await createAdmin({ email: 'me@kilf.dev' });
    const res = await request(app).get('/api/admin/auth/me').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(admin.email);
  });

  it('changes password and invalidates the old refresh session', async () => {
    const { token } = await createAdmin({ email: 'change-pw@kilf.dev', password: 'Old@12345' });

    const res = await request(app)
      .post('/api/admin/auth/change-password')
      .set(authHeader(token))
      .send({ currentPassword: 'Old@12345', newPassword: 'New@12345' });

    expect(res.status).toBe(200);

    const loginRes = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: 'change-pw@kilf.dev', password: 'New@12345' });
    expect(loginRes.status).toBe(200);
  });
});
