import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Tournament Teams (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let tournamentId: string;
  let teamId: string;

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

    // Create a tournament for testing
    const tournamentResponse = await request(app.getHttpServer())
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'E2E Test Tournament',
        startDate: '2025-03-15',
      });
    tournamentId = tournamentResponse.body.id;

    // Get a team ID (assuming teams exist from seed)
    const teamsResponse = await request(app.getHttpServer()).get('/api/teams');
    if (teamsResponse.body.length > 0) {
      teamId = teamsResponse.body[0].id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/tournaments/:tournamentId/teams', () => {
    it('should add a team to tournament', () => {
      return request(app.getHttpServer())
        .post(`/api/tournaments/${tournamentId}/teams`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teamId,
          region: 'East',
          seed: 1,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.tournamentId).toBe(tournamentId);
          expect(res.body.teamId).toBe(teamId);
          expect(res.body.region).toBe('East');
          expect(res.body.seed).toBe(1);
        });
    });

    it('should return 409 for duplicate team in tournament', async () => {
      // Team already added in previous test
      return request(app.getHttpServer())
        .post(`/api/tournaments/${tournamentId}/teams`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teamId,
          region: 'West',
          seed: 2,
        })
        .expect(409);
    });

    it('should return 409 for duplicate region+seed combination', async () => {
      // Get another team
      const teamsResponse = await request(app.getHttpServer()).get('/api/teams');
      const anotherTeamId = teamsResponse.body[1]?.id;

      if (anotherTeamId) {
        return request(app.getHttpServer())
          .post(`/api/tournaments/${tournamentId}/teams`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            teamId: anotherTeamId,
            region: 'East',
            seed: 1, // Same region+seed as first team
          })
          .expect(409);
      }
    });
  });

  describe('GET /api/tournaments/:tournamentId/teams', () => {
    it('should return all teams for tournament', () => {
      return request(app.getHttpServer())
        .get(`/api/tournaments/${tournamentId}/teams`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});

