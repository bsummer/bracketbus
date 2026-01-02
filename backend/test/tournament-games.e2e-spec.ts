import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Tournament Games (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let tournamentId: string;
  let team1Id: string;
  let team2Id: string;
  let tournamentTeam1Id: string;
  let tournamentTeam2Id: string;
  let round1Game1Id: string;

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

    // Create a tournament
    const tournamentResponse = await request(app.getHttpServer())
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'E2E Games Test Tournament',
        startDate: '2025-03-15',
      });
    tournamentId = tournamentResponse.body.id;

    // Get teams
    const teamsResponse = await request(app.getHttpServer()).get('/api/teams');
    team1Id = teamsResponse.body[0]?.id;
    team2Id = teamsResponse.body[1]?.id;

    // Add teams to tournament
    const team1Response = await request(app.getHttpServer())
      .post(`/api/tournaments/${tournamentId}/teams`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        teamId: team1Id,
        region: 'East',
        seed: 1,
      });
    tournamentTeam1Id = team1Response.body.id;

    const team2Response = await request(app.getHttpServer())
      .post(`/api/tournaments/${tournamentId}/teams`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        teamId: team2Id,
        region: 'East',
        seed: 2,
      });
    tournamentTeam2Id = team2Response.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/tournaments/:tournamentId/games - Round 1', () => {
    it('should create a Round 1 game', () => {
      return request(app.getHttpServer())
        .post(`/api/tournaments/${tournamentId}/games`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          round: 1,
          gameNumber: 1,
          region: 'East',
          team1Id,
          team2Id,
          status: 'scheduled',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.tournamentId).toBe(tournamentId);
          expect(res.body.round).toBe(1);
          expect(res.body.gameNumber).toBe(1);
          expect(res.body.region).toBe('East');
          expect(res.body.team1Id).toBe(team1Id);
          expect(res.body.team2Id).toBe(team2Id);
          round1Game1Id = res.body.id;
        });
    });

    it('should return 409 for duplicate game number in same round', () => {
      return request(app.getHttpServer())
        .post(`/api/tournaments/${tournamentId}/games`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          round: 1,
          gameNumber: 1, // Duplicate
          region: 'East',
          team1Id,
          team2Id,
        })
        .expect(409);
    });

    it('should return 400 if region missing for Round 1', () => {
      return request(app.getHttpServer())
        .post(`/api/tournaments/${tournamentId}/games`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          round: 1,
          gameNumber: 2,
          team1Id,
          team2Id,
        })
        .expect(400);
    });
  });

  describe('POST /api/tournaments/:tournamentId/games - Round 2+', () => {
    let round1Game2Id: string;

    beforeAll(async () => {
      // Create a second Round 1 game
      const game2Response = await request(app.getHttpServer())
        .post(`/api/tournaments/${tournamentId}/games`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          round: 1,
          gameNumber: 2,
          region: 'East',
          team1Id: team1Id,
          team2Id: team2Id,
        });
      round1Game2Id = game2Response.body.id;
    });

    it('should create a Round 2 game with parent games', () => {
      return request(app.getHttpServer())
        .post(`/api/tournaments/${tournamentId}/games`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          round: 2,
          gameNumber: 1,
          parentGame1Id: round1Game1Id,
          parentGame2Id: round1Game2Id,
          status: 'scheduled',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.round).toBe(2);
          expect(res.body.parentGame1Id).toBe(round1Game1Id);
          expect(res.body.parentGame2Id).toBe(round1Game2Id);
        });
    });

    it('should return 400 if parent games missing for Round 2+', () => {
      return request(app.getHttpServer())
        .post(`/api/tournaments/${tournamentId}/games`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          round: 2,
          gameNumber: 2,
          // Missing parent games
        })
        .expect(400);
    });

    it('should return 400 if parent game from wrong round', async () => {
      // This would require creating a Round 2 game first, then trying to use it as parent for Round 2
      // For now, we'll test that parent games must be from previous round
      return request(app.getHttpServer())
        .post(`/api/tournaments/${tournamentId}/games`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          round: 3,
          gameNumber: 1,
          parentGame1Id: round1Game1Id, // Round 1 game used as parent for Round 3 (should be Round 2)
          parentGame2Id: round1Game2Id,
        })
        .expect(400);
    });
  });

  describe('GET /api/tournaments/:tournamentId/games', () => {
    it('should return all games for tournament', () => {
      return request(app.getHttpServer())
        .get(`/api/tournaments/${tournamentId}/games`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should filter games by round', () => {
      return request(app.getHttpServer())
        .get(`/api/tournaments/${tournamentId}/games?round=1`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((game: any) => {
            expect(game.round).toBe(1);
          });
        });
    });
  });
});

