import { AppDataSource } from '../../data-source';
import * as entities from '../../common/entities';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

interface TeamCSVRow {
  team_name: string;
  region: string;
  seed: string;
  logo_url?: string;
  tournament_name: string;
}

async function importTeamsFromCSV(csvFilePath: string) {
  const source = AppDataSource;
  
  if (!source.isInitialized) {
    await source.initialize();
  }

  try {
    // Read and parse CSV
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    const records: TeamCSVRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    console.log(`Found ${records.length} teams in CSV`);

    // Get repositories
    const teamRepository = source.getRepository(entities.Team);
    const tournamentRepository = source.getRepository(entities.Tournament);
    const tournamentTeamRepository = source.getRepository(entities.TournamentTeam);

    // Group by tournament
    const teamsByTournament = records.reduce((acc, row) => {
      if (!acc[row.tournament_name]) {
        acc[row.tournament_name] = [];
      }
      acc[row.tournament_name].push(row);
      return acc;
    }, {} as Record<string, TeamCSVRow[]>);

    // Process each tournament
    for (const [tournamentName, teamRows] of Object.entries(teamsByTournament)) {
      console.log(`\nProcessing tournament: ${tournamentName}`);
      
      // Find tournament
      const tournament = await tournamentRepository.findOne({
        where: { name: tournamentName },
      });

      if (!tournament) {
        console.error(`Tournament "${tournamentName}" not found. Skipping teams for this tournament.`);
        continue;
      }

      // Process each team
      for (const row of teamRows) {
        try {
          // Find or create team
          let team = await teamRepository.findOne({
            where: { name: row.team_name },
          });

          if (!team) {
            team = new entities.Team();
            team.name = row.team_name;
            team.logoUrl = row.logo_url || null;
            team = await teamRepository.save(team);
            console.log(`  Created team: ${team.name}`);
          } else {
            // Update logo URL if provided and different
            if (row.logo_url && team.logoUrl !== row.logo_url) {
              team.logoUrl = row.logo_url;
              await teamRepository.save(team);
              console.log(`  Updated logo for team: ${team.name}`);
            }
          }

          // Create or update tournament-team relationship
          const seed = parseInt(row.seed, 10);
          if (isNaN(seed) || seed < 1 || seed > 16) {
            console.error(`  Invalid seed "${row.seed}" for team ${row.team_name}. Skipping.`);
            continue;
          }

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
            tournamentTeam.seed = seed;
            tournamentTeam.region = row.region;
            tournamentTeam = await tournamentTeamRepository.save(tournamentTeam);
            console.log(`  Created tournament-team: ${team.name} (${row.region} #${seed})`);
          } else {
            // Update seed and region if changed
            const updated = tournamentTeam.seed !== seed || tournamentTeam.region !== row.region;
            if (updated) {
              tournamentTeam.seed = seed;
              tournamentTeam.region = row.region;
              await tournamentTeamRepository.save(tournamentTeam);
              console.log(`  Updated tournament-team: ${team.name} (${row.region} #${seed})`);
            } else {
              console.log(`  Tournament-team already exists: ${team.name} (${row.region} #${seed})`);
            }
          }
        } catch (error) {
          console.error(`  Error processing team ${row.team_name}:`, error);
        }
      }
    }

    console.log('\nImport completed!');
  } catch (error) {
    console.error('Error importing teams:', error);
    throw error;
  } finally {
    await source.destroy();
  }
}

// Run script
const csvFilePath = process.argv[2];
if (!csvFilePath) {
  console.error('Usage: ts-node -r tsconfig-paths/register src/database/seeds/import-teams.ts <path-to-csv-file>');
  process.exit(1);
}

if (!fs.existsSync(csvFilePath)) {
  console.error(`CSV file not found: ${csvFilePath}`);
  process.exit(1);
}

importTeamsFromCSV(csvFilePath)
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
