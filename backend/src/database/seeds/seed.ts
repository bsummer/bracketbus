import { AppDataSource } from '../../data-source';
import * as entities from '../../common/entities';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

interface TeamData {
  name: string;
  seed: number;
  region: string;
  logoUrl: string;
}

interface TournamentData {
  name: string;
  startDate: string;
}

async function generateGames(
  tournament: entities.Tournament,
  tournamentTeams: entities.TournamentTeam[],
  gameRepository: any,
) {
  const regions = ['East', 'West', 'Midwest', 'South'];

  // Group tournament teams by region
  const teamsByRegion: { [key: string]: entities.TournamentTeam[] } = {};
  regions.forEach((region) => {
    teamsByRegion[region] = tournamentTeams
      .filter((tt) => tt.region === region)
      .sort((a, b) => a.seed - b.seed);
  });

  let gameNumber = 1;

  // Round 1: Region play (64 teams -> 32 teams)
  const round1Games: entities.Game[] = [];
  regions.forEach((region) => {
    const regionTeams = teamsByRegion[region];
    for (let i = 0; i < 8; i++) {
      const team1 = regionTeams[i];
      const team2 = regionTeams[15 - i]; // 1 vs 16, 2 vs 15, etc.

      const game = new entities.Game();
      game.round = 1;
      game.tournamentId = tournament.id;
      game.gameNumber = gameNumber++;
      game.team1Id = team1.teamId;
      game.team2Id = team2.teamId;
      game.status = entities.GameStatus.SCHEDULED;
      round1Games.push(game);
    }
  });

  // Save round 1 games first to get IDs
  const savedRound1 = await gameRepository.save(round1Games);

  // Round 2: Region play (32 teams -> 16 teams)
  const round2Games: entities.Game[] = [];
  for (let i = 0; i < savedRound1.length; i += 2) {
    const game = new entities.Game();
    game.round = 2;
    game.tournamentId = tournament.id;
    game.gameNumber = gameNumber++;
    game.parentGame1Id = savedRound1[i].id;
    game.parentGame2Id = savedRound1[i + 1].id;
    game.status = entities.GameStatus.SCHEDULED;
    round2Games.push(game);
  }
  const savedRound2 = await gameRepository.save(round2Games);

  // Round 3: Region play (16 teams -> 8 teams)
  const round3Games: entities.Game[] = [];
  for (let i = 0; i < savedRound2.length; i += 2) {
    const game = new entities.Game();
    game.round = 3;
    game.tournamentId = tournament.id;
    game.gameNumber = gameNumber++;
    game.parentGame1Id = savedRound2[i].id;
    game.parentGame2Id = savedRound2[i + 1].id;
    game.status = entities.GameStatus.SCHEDULED;
    round3Games.push(game);
  }
  const savedRound3 = await gameRepository.save(round3Games);

  // Round 4: Region finals (8 teams -> 4 teams)
  const round4Games: entities.Game[] = [];
  for (let i = 0; i < savedRound3.length; i += 2) {
    const game = new entities.Game();
    game.round = 4;
    game.tournamentId = tournament.id;
    game.gameNumber = gameNumber++;
    game.parentGame1Id = savedRound3[i].id;
    game.parentGame2Id = savedRound3[i + 1].id;
    game.status = entities.GameStatus.SCHEDULED;
    round4Games.push(game);
  }
  const savedRound4 = await gameRepository.save(round4Games);

  // Round 5: Final Four (4 teams -> 2 teams)
  const round5Games: entities.Game[] = [];
  for (let i = 0; i < savedRound4.length; i += 2) {
    const game = new entities.Game();
    game.round = 5;
    game.tournamentId = tournament.id;
    game.gameNumber = gameNumber++;
    game.parentGame1Id = savedRound4[i].id;
    game.parentGame2Id = savedRound4[i + 1].id;
    game.status = entities.GameStatus.SCHEDULED;
    round5Games.push(game);
  }
  const savedRound5 = await gameRepository.save(round5Games);

  // Round 6: Championship (2 teams -> 1 winner)
  const championshipGame = new entities.Game();
  championshipGame.round = 6;
  championshipGame.tournamentId = tournament.id;
  championshipGame.gameNumber = gameNumber++;
  championshipGame.parentGame1Id = savedRound5[0].id;
  championshipGame.parentGame2Id = savedRound5[1].id;
  championshipGame.status = entities.GameStatus.SCHEDULED;
  await gameRepository.save(championshipGame);

  return (
    savedRound1.length +
    savedRound2.length +
    savedRound3.length +
    savedRound4.length +
    savedRound5.length +
    1
  );
}

export async function seedDatabase(dataSourceToUse?: DataSource) {
  const source = dataSourceToUse || AppDataSource;
  
  
  try {
    // Only initialize if not already initialized
    if (!source.isInitialized) {
      await source.initialize();
      console.log('Database connection initialized');
    }
    

    const userRepository = source.getRepository(entities.User);
    const tournamentRepository = source.getRepository(entities.Tournament);
    const teamRepository = source.getRepository(entities.Team);
    const tournamentTeamRepository = source.getRepository(entities.TournamentTeam);
    const gameRepository = source.getRepository(entities.Game);

    // Load tournament data
    const tournamentsPath = path.join(__dirname, '../../../tournaments.json');
    let tournamentData: TournamentData[];
    if (fs.existsSync(tournamentsPath)) {
      tournamentData = JSON.parse(fs.readFileSync(tournamentsPath, 'utf-8'));
    } else {
      tournamentData = [
        {
          name: '2025 NCAA Championship Tournament',
          startDate: '2025-03-13',
        },
      ];
    }

    // Load teams data
    const teamsPath = path.join(__dirname, '../../../teams.json');
    const teamsData: TeamData[] = JSON.parse(fs.readFileSync(teamsPath, 'utf-8'));

    // Create test users
    const testUsers = [
      { username: 'admin', email: 'admin@example.com', password: 'admin123' },
      { username: 'user1', email: 'user1@example.com', password: 'user123' },
      { username: 'user2', email: 'user2@example.com', password: 'user123' },
    ];

    console.log('Creating test users...');
    for (const userData of testUsers) {
      const existingUser = await userRepository.findOne({
        where: { username: userData.username },
      });

      if (!existingUser) {
        const user = new entities.User();
        user.username = userData.username;
        user.email = userData.email;
        user.passwordHash = await bcrypt.hash(userData.password, 10);
        await userRepository.save(user);
        console.log(`Created user: ${userData.username} (${userData.email})`);
      } else {
        // Update existing user with email if missing
        if (!existingUser.email) {
          existingUser.email = userData.email;
          await userRepository.save(existingUser);
          console.log(`Updated user ${userData.username} with email: ${userData.email}`);
        } else {
          console.log(`User ${userData.username} already exists`);
        }
      }
    }

    // Create tournament
    console.log('Creating tournament...');
    let tournament = await tournamentRepository.findOne({
      where: { name: tournamentData[0].name },
    });

    if (!tournament) {
      tournament = new entities.Tournament();
      tournament.name = tournamentData[0].name;
      tournament.startDate = new Date(tournamentData[0].startDate);
      tournament = await tournamentRepository.save(tournament);
      console.log(`Created tournament: ${tournament.name}`);
    } else {
      console.log(`Tournament ${tournament.name} already exists`);
    }

    // Create teams (without seed/region)
    console.log('Creating teams...');
    const teams: entities.Team[] = [];
    for (const teamData of teamsData) {
      let team = await teamRepository.findOne({
        where: { name: teamData.name },
      });

      if (!team) {
        team = new entities.Team();
        team.name = teamData.name;
        team.logoUrl = teamData.logoUrl;
        team = await teamRepository.save(team);
        console.log(`Created team: ${team.name}`);
      } else {
        console.log(`Team ${team.name} already exists`);
      }
      teams.push(team);
    }

    // Create tournament-team relationships
    console.log('Creating tournament-team relationships...');
    const tournamentTeams: entities.TournamentTeam[] = [];
    for (let i = 0; i < teamsData.length; i++) {
      const teamData = teamsData[i];
      const team = teams[i];
      
      let tournamentTeam = await tournamentTeamRepository.findOne({
        where: {
          tournamentId: tournament.id,
          teamId: team.id,
        },
      });

      if (!tournamentTeam) {
        tournamentTeam = new entities.TournamentTeam();
        tournamentTeam.tournamentId = tournament.id;
        tournamentTeam.teamId = team.id;
        tournamentTeam.seed = teamData.seed;
        tournamentTeam.region = teamData.region;
        tournamentTeam = await tournamentTeamRepository.save(tournamentTeam);
        console.log(`Created tournament-team: ${team.name} (${teamData.region} #${teamData.seed})`);
      } else {
        console.log(`Tournament-team relationship for ${team.name} already exists`);
      }
      tournamentTeams.push(tournamentTeam);
    }

    // Create games
    console.log('Creating games...');
    const existingGames = await gameRepository.find({
      where: { tournamentId: tournament.id },
    });

    if (existingGames.length === 0) {
      const gameCount = await generateGames(tournament, tournamentTeams, gameRepository);
      console.log(`Created ${gameCount} games`);
    } else {
      console.log(`Games already exist for tournament ${tournament.name}`);
    }

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    if(!dataSourceToUse) {
      await source.destroy();
    }
  }
}

// Run if this file is executed directly (not imported)
if (require.main === module) {
  seedDatabase().catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  });
}

