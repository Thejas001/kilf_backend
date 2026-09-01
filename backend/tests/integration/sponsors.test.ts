import request from 'supertest';
import { createApp } from '../../src/app';
import { createAdmin, authHeader } from '../utils/factories';

const app = createApp();

describe('Sponsor management', () => {
  it('creates a sponsor', async () => {
    const { token } = await createAdmin();

    const res = await request(app)
      .post('/api/admin/sponsors')
      .set(authHeader(token))
      .send({
        name: 'Penguin Random House',
        sponsorshipLevel: 'TITLE',
        amount: 1000000,
        displayOrder: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Penguin Random House');
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('updates a sponsor', async () => {
    const { token } = await createAdmin();
    const created = await request(app)
      .post('/api/admin/sponsors')
      .set(authHeader(token))
      .send({ name: 'HarperCollins', sponsorshipLevel: 'GOLD' });

    const res = await request(app)
      .put(`/api/admin/sponsors/${created.body.data.id}`)
      .set(authHeader(token))
      .send({ sponsorshipLevel: 'PLATINUM', amount: 500000 });

    expect(res.status).toBe(200);
    expect(res.body.data.sponsorshipLevel).toBe('PLATINUM');
  });

  it('deletes a sponsor', async () => {
    const { token } = await createAdmin({ role: 'SUPER_ADMIN' });
    const created = await request(app)
      .post('/api/admin/sponsors')
      .set(authHeader(token))
      .send({ name: 'Temp Sponsor' });

    const res = await request(app)
      .delete(`/api/admin/sponsors/${created.body.data.id}`)
      .set(authHeader(token));
    expect(res.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/admin/sponsors/${created.body.data.id}`)
      .set(authHeader(token));
    expect(getRes.status).toBe(404);
  });

  it('public API returns only active sponsors sorted by display order', async () => {
    const { token } = await createAdmin();
    const s1 = await request(app)
      .post('/api/admin/sponsors')
      .set(authHeader(token))
      .send({ name: 'Second', displayOrder: 2 });
    await request(app)
      .post('/api/admin/sponsors')
      .set(authHeader(token))
      .send({ name: 'First', displayOrder: 1 });
    const inactive = await request(app)
      .post('/api/admin/sponsors')
      .set(authHeader(token))
      .send({ name: 'Hidden', displayOrder: 0 });
    await request(app)
      .patch(`/api/admin/sponsors/${inactive.body.data.id}/status`)
      .set(authHeader(token))
      .send({ status: 'INACTIVE' });

    const res = await request(app).get('/api/sponsors');
    expect(res.status).toBe(200);
    const names = res.body.data.map((s: { name: string }) => s.name);
    expect(names).toEqual(['First', 'Second']);
    expect(names).not.toContain('Hidden');
    expect(s1.body.data).toBeDefined();
  });
});
