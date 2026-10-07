import request from 'supertest';
import { createApp } from '../../src/app';
import { createAdmin, authHeader } from '../utils/factories';

const app = createApp();

const valid = {
  name: 'Anu Menon',
  whatsappNumber: '98765 43210',
  email: 'Anu@Example.com',
  townOrCity: 'Kollam',
  ageGroup: '25-34',
  interests: ['AUTHOR_TALKS', 'BOOK_FAIR'],
};

describe('Early bird registration', () => {
  it('registers and normalises the phone number and email', async () => {
    const res = await request(app).post('/api/early-bird').send(valid);
    expect(res.status).toBe(201);

    const { token } = await createAdmin();
    const list = await request(app).get('/api/admin/early-bird').set(authHeader(token));
    expect(list.body.data[0]).toMatchObject({
      whatsappNumber: '9876543210',
      email: 'anu@example.com',
      interests: ['AUTHOR_TALKS', 'BOOK_FAIR'],
    });
  });

  it('accepts a +91 prefix and no email or interests', async () => {
    const res = await request(app)
      .post('/api/early-bird')
      .send({ ...valid, whatsappNumber: '+91 9876543210', email: '', interests: undefined });
    expect(res.status).toBe(201);
  });

  it('rejects an invalid number, age group, interest or name', async () => {
    for (const bad of [
      { whatsappNumber: '12345' },
      { ageGroup: 'Ancient' },
      { interests: ['NOPE'] },
      { name: '' },
    ]) {
      const res = await request(app).post('/api/early-bird').send({ ...valid, ...bad });
      expect(res.status).toBe(400);
    }
  });

  it('rejects a duplicate WhatsApp number', async () => {
    await request(app).post('/api/early-bird').send(valid);
    const res = await request(app)
      .post('/api/early-bird')
      .send({ ...valid, whatsappNumber: '+919876543210' });
    expect(res.status).toBe(409);
  });

  it('stores interestType (default REGISTER) and filters by it', async () => {
    await request(app).post('/api/early-bird').send(valid);
    await request(app)
      .post('/api/early-bird')
      .send({ ...valid, whatsappNumber: '9123456780', interestType: 'VOLUNTEER' });
    const bad = await request(app)
      .post('/api/early-bird')
      .send({ ...valid, whatsappNumber: '9123456781', interestType: 'NOPE' });
    expect(bad.status).toBe(400);

    const { token } = await createAdmin();
    const all = await request(app).get('/api/admin/early-bird').set(authHeader(token));
    expect(all.body.pagination.total).toBe(2);
    const vol = await request(app)
      .get('/api/admin/early-bird?interestType=VOLUNTEER')
      .set(authHeader(token));
    expect(vol.body.data).toHaveLength(1);
    expect(vol.body.data[0].interestType).toBe('VOLUNTEER');
    const reg = await request(app)
      .get('/api/admin/early-bird?interestType=REGISTER')
      .set(authHeader(token));
    expect(reg.body.data[0].whatsappNumber).toBe('9876543210');
  });

  it('requires admin auth to list and export', async () => {
    expect((await request(app).get('/api/admin/early-bird')).status).toBe(401);
    expect((await request(app).get('/api/admin/early-bird/export')).status).toBe(401);
  });

  it('exports CSV', async () => {
    await request(app).post('/api/early-bird').send(valid);
    const { token } = await createAdmin();
    const res = await request(app).get('/api/admin/early-bird/export').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('REGISTER,Anu Menon,9876543210,anu@example.com,Kollam,25-34,AUTHOR_TALKS; BOOK_FAIR');
  });
});
