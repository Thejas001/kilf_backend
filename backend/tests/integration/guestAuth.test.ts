import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { authHeader } from '../utils/factories';

const app = createApp();

const valid = {
  name: 'Guest User',
  email: 'Guest@KILF.dev',
  password: 'Secret123',
  confirmPassword: 'Secret123',
};

describe('Guest register', () => {
  it('creates an account and returns tokens without the password hash', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.guest.email).toBe('guest@kilf.dev');
    expect(res.body.guest).not.toHaveProperty('passwordHash');
  });

  it('rejects mismatched passwords', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...valid, confirmPassword: 'Different123' });
    expect(res.status).toBe(400);
    expect(await prisma.guest.count()).toBe(0);
  });

  it('rejects weak passwords', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...valid, password: 'password', confirmPassword: 'password' });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate email', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(409);
  });
});

describe('Guest login & session', () => {
  it('logs in with correct credentials (case-insensitive email)', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'guest@kilf.dev', password: valid.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects a wrong password and an unknown email identically', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: valid.email, password: 'Wrong12345' });
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@kilf.dev', password: 'Wrong12345' });
    expect(bad.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(bad.body.message).toBe(unknown.body.message);
  });

  it('serves /me with a guest token and rejects no token', async () => {
    const reg = await request(app).post('/api/auth/register').send(valid);
    const ok = await request(app).get('/api/auth/me').set(authHeader(reg.body.token));
    expect(ok.status).toBe(200);
    expect(ok.body.data.email).toBe('guest@kilf.dev');

    const none = await request(app).get('/api/auth/me');
    expect(none.status).toBe(401);
  });

  it('does not let a guest token reach admin routes', async () => {
    const reg = await request(app).post('/api/auth/register').send(valid);
    const res = await request(app).get('/api/admin/auth/me').set(authHeader(reg.body.token));
    expect(res.status).toBe(401);
  });

  it('rotates refresh tokens and invalidates the old one', async () => {
    const reg = await request(app).post('/api/auth/register').send(valid);
    const first = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: reg.body.refreshToken });
    expect(first.status).toBe(200);

    const replay = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: reg.body.refreshToken });
    expect(replay.status).toBe(401);
  });

  it('logs out by revoking the refresh token', async () => {
    const reg = await request(app).post('/api/auth/register').send(valid);
    const out = await request(app).post('/api/auth/logout').set(authHeader(reg.body.token));
    expect(out.status).toBe(200);

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: reg.body.refreshToken });
    expect(res.status).toBe(401);
  });
});

describe('Guest passwords', () => {
  it('changes password after verifying the current one', async () => {
    const reg = await request(app).post('/api/auth/register').send(valid);

    const wrong = await request(app)
      .post('/api/auth/change-password')
      .set(authHeader(reg.body.token))
      .send({ currentPassword: 'Nope12345', newPassword: 'NewPass123', confirmPassword: 'NewPass123' });
    expect(wrong.status).toBe(400);

    const ok = await request(app)
      .post('/api/auth/change-password')
      .set(authHeader(reg.body.token))
      .send({ currentPassword: valid.password, newPassword: 'NewPass123', confirmPassword: 'NewPass123' });
    expect(ok.status).toBe(200);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: valid.email, password: 'NewPass123' });
    expect(login.status).toBe(200);
  });

  it('resets a forgotten password with the issued token', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: valid.email });
    expect(forgot.status).toBe(200);
    const token = forgot.body.data.resetToken;
    expect(token).toBeDefined();

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'Reset12345', confirmPassword: 'Reset12345' });
    expect(reset.status).toBe(200);

    const reuse = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'Another12345', confirmPassword: 'Another12345' });
    expect(reuse.status).toBe(400);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: valid.email, password: 'Reset12345' });
    expect(login.status).toBe(200);
  });

  it('gives the same response for unknown emails on forgot-password', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'ghost@kilf.dev' });
    expect(res.status).toBe(200);
  });
});
