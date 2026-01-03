import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Tournaments (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login as admin
    const adminResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    adminToken = adminResponse.body.access_token;

    // Login as regular user
    const userResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'user1', password: 'user123' });
    userToken = userResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/tournaments', () => {
    it('should return tournaments for admin user', () => {
      return request(app.getHttpServer())
        .get('/api/tournaments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should return 403 for non-admin user', () => {
      return request(app.getHttpServer())
        .get('/api/tournaments')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 401 for unauthenticated request', () => {
      return request(app.getHttpServer())
        .get('/api/tournaments')
        .expect(401);
    });
  });

  describe('POST /api/tournaments', () => {
    it('should create a tournament for admin user', () => {
      return request(app.getHttpServer())
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Tournament',
          startDate: '2025-03-15',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('Test Tournament');
          expect(res.body.id).toBeDefined();
        });
    });

    it('should return 409 for duplicate tournament name', async () => {
      // Create first tournament
      await request(app.getHttpServer())
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Tournament',
          startDate: '2025-03-15',
        });

      // Try to create duplicate
      return request(app.getHttpServer())
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Tournament',
          startDate: '2025-03-16',
        })
        .expect(409);
    });

    it('should return 403 for non-admin user', () => {
      return request(app.getHttpServer())
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Test Tournament',
          startDate: '2025-03-15',
        })
        .expect(403);
    });
  });

  describe('GET /api/tournaments/:id', () => {
    let tournamentId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Get Tournament Test',
          startDate: '2025-03-15',
        });
      tournamentId = response.body.id;
    });

    it('should return tournament by id for admin', () => {
      return request(app.getHttpServer())
        .get(`/api/tournaments/${tournamentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(tournamentId);
          expect(res.body.name).toBe('Get Tournament Test');
        });
    });

    it('should return 404 for non-existent tournament', () => {
      return request(app.getHttpServer())
        .get('/api/tournaments/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('DELETE /api/tournaments/:id', () => {
    let tournamentId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Delete Tournament Test',
          startDate: '2025-03-15',
        });
      tournamentId = response.body.id;
    });

    it('should delete tournament for admin', () => {
      return request(app.getHttpServer())
        .delete(`/api/tournaments/${tournamentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should return 403 for non-admin user', () => {
      return request(app.getHttpServer())
        .delete(`/api/tournaments/${tournamentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});

