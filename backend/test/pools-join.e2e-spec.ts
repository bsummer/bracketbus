import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Pools Join (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let poolId: string;
  let inviteCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login as admin
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    authToken = loginResponse.body.access_token;
  });

  beforeEach(async () => {
    // Create a test tournament and pool for each test
    const tournamentResponse = await request(app.getHttpServer())
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: `Test Tournament ${Date.now()}`,
        startDate: new Date().toISOString(),
      });

    const tournamentId = tournamentResponse.body.id;

    const poolResponse = await request(app.getHttpServer())
      .post('/api/pools')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: `Test Pool ${Date.now()}`,
        tournamentId,
      });

    poolId = poolResponse.body.id;
    inviteCode = poolResponse.body.inviteCode;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/pools/join', () => {
    it('should join a pool with a valid invite code', async () => {
      // Create a second user
      const registerResponse = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: `testuser${Date.now()}`,
          email: `test${Date.now()}@example.com`,
          password: 'password123',
        });

      const newUserToken = registerResponse.body.access_token;
      const newUserId = registerResponse.body.user.id;

      const response = await request(app.getHttpServer())
        .post('/api/pools/join')
        .set('Authorization', `Bearer ${newUserToken}`)
        .send({
          inviteCode,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBe(poolId);
      expect(response.body.members).toBeDefined();
      expect(response.body.members.some((m: any) => m.userId === newUserId)).toBe(true);
    });

    it('should return 404 for invalid invite code', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/pools/join')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          inviteCode: 'INVALID1',
        })
        .expect(404);

      expect(response.body.message).toContain('Invalid invite code');
    });

    it('should return 401 if not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/api/pools/join')
        .send({
          inviteCode,
        })
        .expect(401);
    });

    it('should return 409 if already a member', async () => {
      // Creator is already a member, try to join again
      const response = await request(app.getHttpServer())
        .post('/api/pools/join')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          inviteCode,
        })
        .expect(409);

      expect(response.body.message).toContain('Already a member');
    });

    it('should validate invite code format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/pools/join')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          inviteCode: 'TOOSHORT',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });
});

