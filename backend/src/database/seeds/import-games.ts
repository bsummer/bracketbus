import { AppDataSource } from '../../data-source';
import * as entities from '../../common/entities';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

interface GameCSVRow {
  game_number: string;
  round: string;
  region?: string;
  team1_seed?: string;
  team2_seed?: string;
  parent_game1_number?: string;
  parent_game2_number?: string;
  tournament_name: string;
}

async function importGamesFromCSV(csvFilePath: string) {
  const source = AppDataSource;
  
  if (!source.isInitialized) {
    await source.initialize();
  }

  try {
    // Read and parse CSV
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    const records: GameCSVRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    console.log(`Found ${records.length} games in CSV`);

    // Get repositories
    const tournamentRepository = source.getRepository(entities.Tournament);
    const tournamentTeamRepository = source.getRepository(entities.TournamentTeam);
    const gameRepository = source.getRepository(entities.Game);

    // Group games by tournament
    const gamesByTournament = records.reduce((acc, row) => {
      if (!acc[row.tournament_name]) {
        acc[row.tournament_name] = [];
      }
      acc[row.tournament_name].push(row);
      return acc;
    }, {} as Record<string, GameCSVRow[]>);

    // Process each tournament
    for (const [tournamentName, gameRows] of Object.entries(gamesByTournament)) {
      console.log(`\nProcessing tournament: ${tournamentName}`);
      
      // Find tournament
      const tournament = await tournamentRepository.findOne({
        where: { name: tournamentName },
      });

      if (!tournament) {
        console.error(`Tournament "${tournamentName}" not found. Skipping games for this tournament.`);
        continue;
      }

      // Sort games by round and game number
      const sortedGames = gameRows.sort((a, b) => {
        const roundA = parseInt(a.round, 10);
        const roundB = parseInt(b.round, 10);
        if (roundA !== roundB) {
          return roundA - roundB;
        }
        const gameNumA = parseInt(a.game_number, 10);
        const gameNumB = parseInt(b.game_number, 10);
        return gameNumA - gameNumB;
      });

      // Create a map to store created games by game number for parent lookups
      const gamesByNumber: Map<number, entities.Game> = new Map();

      // Process games in order (must process Round 1 first, then Round 2+, etc.)
      for (const row of sortedGames) {
        try {
          const round = parseInt(row.round, 10);
          const gameNumber = parseInt(row.game_number, 10);

          if (isNaN(round) || round < 1 || round > 6) {
            console.error(`  Invalid round "${row.round}" for game ${gameNumber}. Skipping.`);
            continue;
          }

          if (isNaN(gameNumber) || gameNumber < 1) {
            console.error(`  Invalid game number "${row.game_number}". Skipping.`);
            continue;
          }

          // Check if game already exists
          const existingGame = await gameRepository.findOne({
            where: {
              tournamentId: tournament.id,
              gameNumber: gameNumber,
            },
          });

          if (existingGame) {
            console.log(`  Game ${gameNumber} (Round ${round}) already exists. Skipping.`);
            gamesByNumber.set(gameNumber, existingGame);
            continue;
          }

          const game = new entities.Game();
          game.round = round;
          game.tournamentId = tournament.id;
          game.gameNumber = gameNumber;
          game.status = entities.GameStatus.SCHEDULED;

          // Round 1: Set teams from seeds and region
          if (round === 1) {
            if (!row.region) {
              console.error(`  Game ${gameNumber} (Round 1) missing region. Skipping.`);
              continue;
            }

            if (!row.team1_seed || !row.team2_seed) {
              console.error(`  Game ${gameNumber} (Round 1) missing team seeds. Skipping.`);
              continue;
            }

            const seed1 = parseInt(row.team1_seed, 10);
            const seed2 = parseInt(row.team2_seed, 10);

            if (isNaN(seed1) || isNaN(seed2) || seed1 < 1 || seed1 > 16 || seed2 < 1 || seed2 > 16) {
              console.error(`  Game ${gameNumber} (Round 1) has invalid seeds. Skipping.`);
              continue;
            }

            // Find teams by region and seed
            const team1TournamentTeam = await tournamentTeamRepository.findOne({
              where: {
                tournamentId: tournament.id,
                region: row.region,
                seed: seed1,
              },
            });

            const team2TournamentTeam = await tournamentTeamRepository.findOne({
              where: {
                tournamentId: tournament.id,
                region: row.region,
                seed: seed2,
              },
            });

            if (!team1TournamentTeam) {
              console.error(`  Game ${gameNumber}: Team 1 (${row.region} #${seed1}) not found. Skipping.`);
              continue;
            }

            if (!team2TournamentTeam) {
              console.error(`  Game ${gameNumber}: Team 2 (${row.region} #${seed2}) not found. Skipping.`);
              continue;
            }

            game.region = row.region;
            game.team1Id = team1TournamentTeam.teamId;
            game.team2Id = team2TournamentTeam.teamId;
          } else {
            // Round 2+: Set parent games
            if (!row.parent_game1_number || !row.parent_game2_number) {
              console.error(`  Game ${gameNumber} (Round ${round}) missing parent game numbers. Skipping.`);
              continue;
            }

            const parent1Number = parseInt(row.parent_game1_number, 10);
            const parent2Number = parseInt(row.parent_game2_number, 10);

            if (isNaN(parent1Number) || isNaN(parent2Number)) {
              console.error(`  Game ${gameNumber} (Round ${round}) has invalid parent game numbers. Skipping.`);
              continue;
            }

            // Find parent games
            const parent1 = gamesByNumber.get(parent1Number);
            const parent2 = gamesByNumber.get(parent2Number);

            if (!parent1) {
              console.error(`  Game ${gameNumber}: Parent game 1 (game #${parent1Number}) not found. Make sure parent games are listed before child games. Skipping.`);
              continue;
            }

            if (!parent2) {
              console.error(`  Game ${gameNumber}: Parent game 2 (game #${parent2Number}) not found. Make sure parent games are listed before child games. Skipping.`);
              continue;
            }

            game.parentGame1Id = parent1.id;
            game.parentGame2Id = parent2.id;

            // Set region for rounds 2-4 (null for rounds 5-6)
            if (round >= 2 && round <= 4) {
              game.region = row.region || null;
            } else {
              game.region = null;
            }
          }

          const savedGame = await gameRepository.save(game);
          gamesByNumber.set(gameNumber, savedGame);
          console.log(`  Created game ${gameNumber} (Round ${round}${row.region ? `, ${row.region}` : ''})`);
        } catch (error) {
          console.error(`  Error processing game ${row.game_number}:`, error);
        }
      }
    }

    console.log('\nImport completed!');
  } catch (error) {
    console.error('Error importing games:', error);
    throw error;
  } finally {
    await source.destroy();
  }
}

// Run script
const csvFilePath = process.argv[2];
if (!csvFilePath) {
  console.error('Usage: ts-node -r tsconfig-paths/register src/database/seeds/import-games.ts <path-to-csv-file>');
  process.exit(1);
}

if (!fs.existsSync(csvFilePath)) {
  console.error(`CSV file not found: ${csvFilePath}`);
  process.exit(1);
}

importGamesFromCSV(csvFilePath)
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
