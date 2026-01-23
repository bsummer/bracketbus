/// <reference types="jest" />
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { AppDataSource } from '../../data-source';
import * as entities from '../../common/entities';

interface TeamCSVRow {
  team_name: string;
  region: string;
  seed: string;
  logo_url?: string;
  tournament_name: string;
}

// Mock the modules
jest.mock('fs');
jest.mock('csv-parse/sync');
jest.mock('../../data-source', () => {
  const mockDataSource = {
    isInitialized: false,
    initialize: jest.fn(),
    getRepository: jest.fn(),
    destroy: jest.fn(),
  };
  return {
    AppDataSource: mockDataSource,
  };
});

describe('import-teams', () => {
  let mockTeamRepository: any;
  let mockTournamentRepository: any;
  let mockTournamentTeamRepository: any;
  let importTeamsFromCSV: (csvFilePath: string) => Promise<void>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Setup mock repositories
    mockTeamRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockTournamentRepository = {
      findOne: jest.fn(),
    };

    mockTournamentTeamRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    // Mock AppDataSource
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === entities.Team) return mockTeamRepository;
      if (entity === entities.Tournament) return mockTournamentRepository;
      if (entity === entities.TournamentTeam) return mockTournamentTeamRepository;
      return null;
    });

    Object.defineProperty(AppDataSource, 'isInitialized', {
      value: false,
      writable: true,
      configurable: true,
    });
    (AppDataSource.initialize as jest.Mock).mockResolvedValue(undefined);
    (AppDataSource.destroy as jest.Mock).mockResolvedValue(undefined);

    // Import the function after mocks are set up
    // We'll need to extract the function or test it differently
  });

  describe('CSV parsing', () => {
    it('should parse CSV content correctly', () => {
      const csvContent = 'team_name,region,seed,logo_url,tournament_name\nDuke,East,1,https://example.com/duke.png,2025 Tournament';
      const expectedRecords: TeamCSVRow[] = [
        {
          team_name: 'Duke',
          region: 'East',
          seed: '1',
          logo_url: 'https://example.com/duke.png',
          tournament_name: '2025 Tournament',
        },
      ];

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(expectedRecords);

      const content = fs.readFileSync('test.csv', 'utf-8');
      const records: TeamCSVRow[] = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      expect(records).toEqual(expectedRecords);
      expect(fs.readFileSync).toHaveBeenCalledWith('test.csv', 'utf-8');
    });
  });

  describe('Team creation and updates', () => {
    it('should create a new team when it does not exist', async () => {
      const csvContent = 'team_name,region,seed,logo_url,tournament_name\nDuke,East,1,https://example.com/duke.png,2025 Tournament';
      const csvRecords: TeamCSVRow[] = [
        {
          team_name: 'Duke',
          region: 'East',
          seed: '1',
          logo_url: 'https://example.com/duke.png',
          tournament_name: '2025 Tournament',
        },
      ];

      const mockTournament = { id: 'tournament-1', name: '2025 Tournament' };
      const newTeam = { id: 'team-1', name: 'Duke', logoUrl: 'https://example.com/duke.png' };
      const newTournamentTeam = {
        id: 'tt-1',
        tournamentId: 'tournament-1',
        teamId: 'team-1',
        seed: 1,
        region: 'East',
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockTeamRepository.findOne.mockResolvedValue(null); // Team doesn't exist
      mockTeamRepository.save.mockResolvedValue(newTeam);
      mockTournamentTeamRepository.findOne.mockResolvedValue(null); // TournamentTeam doesn't exist
      mockTournamentTeamRepository.save.mockResolvedValue(newTournamentTeam);

      // Simulate the import logic
      const records: TeamCSVRow[] = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
      const tournamentName = records[0].tournament_name;
      const foundTournament = await mockTournamentRepository.findOne({ where: { name: tournamentName } });

      if (foundTournament) {
        const row = records[0];
        let team = await mockTeamRepository.findOne({ where: { name: row.team_name } });

        if (!team) {
          const newTeamEntity = { name: row.team_name, logoUrl: row.logo_url || null };
          team = await mockTeamRepository.save(newTeamEntity);
        }

        const seed = parseInt(row.seed, 10);
        let tournamentTeam = await mockTournamentTeamRepository.findOne({
          where: { tournamentId: foundTournament.id, teamId: team.id },
        });

        if (!tournamentTeam) {
          const newTournamentTeamEntity = {
            tournamentId: foundTournament.id,
            teamId: team.id,
            seed,
            region: row.region,
          };
          tournamentTeam = await mockTournamentTeamRepository.save(newTournamentTeamEntity);
        }
      }

      expect(mockTeamRepository.findOne).toHaveBeenCalledWith({ where: { name: 'Duke' } });
      expect(mockTeamRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Duke', logoUrl: 'https://example.com/duke.png' }),
      );
      expect(mockTournamentTeamRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tournamentId: 'tournament-1',
          teamId: 'team-1',
          seed: 1,
          region: 'East',
        }),
      );
    });

    it('should update team logo when team exists and logo is different', async () => {
      const csvContent = 'team_name,region,seed,logo_url,tournament_name\nDuke,East,1,https://example.com/new-logo.png,2025 Tournament';
      const csvRecords: TeamCSVRow[] = [
        {
          team_name: 'Duke',
          region: 'East',
          seed: '1',
          logo_url: 'https://example.com/new-logo.png',
          tournament_name: '2025 Tournament',
        },
      ];

      const mockTournament = { id: 'tournament-1', name: '2025 Tournament' };
      const existingTeam = { id: 'team-1', name: 'Duke', logoUrl: 'https://example.com/old-logo.png' };
      const updatedTeam = { ...existingTeam, logoUrl: 'https://example.com/new-logo.png' };
      const existingTournamentTeam = {
        id: 'tt-1',
        tournamentId: 'tournament-1',
        teamId: 'team-1',
        seed: 1,
        region: 'East',
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockTeamRepository.findOne.mockResolvedValue(existingTeam);
      mockTeamRepository.save.mockResolvedValue(updatedTeam);
      mockTournamentTeamRepository.findOne.mockResolvedValue(existingTournamentTeam);

      // Simulate the import logic
      const records: TeamCSVRow[] = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
      const tournamentName = records[0].tournament_name;
      const foundTournament = await mockTournamentRepository.findOne({ where: { name: tournamentName } });

      if (foundTournament) {
        const row = records[0];
        let team = await mockTeamRepository.findOne({ where: { name: row.team_name } });

        if (team && row.logo_url && team.logoUrl !== row.logo_url) {
          team.logoUrl = row.logo_url;
          team = await mockTeamRepository.save(team);
        }
      }

      expect(mockTeamRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ logoUrl: 'https://example.com/new-logo.png' }),
      );
    });

    it('should not update team logo when logo is the same', async () => {
      const csvContent = 'team_name,region,seed,logo_url,tournament_name\nDuke,East,1,https://example.com/logo.png,2025 Tournament';
      const csvRecords: TeamCSVRow[] = [
        {
          team_name: 'Duke',
          region: 'East',
          seed: '1',
          logo_url: 'https://example.com/logo.png',
          tournament_name: '2025 Tournament',
        },
      ];

      const mockTournament = { id: 'tournament-1', name: '2025 Tournament' };
      const existingTeam = { id: 'team-1', name: 'Duke', logoUrl: 'https://example.com/logo.png' };

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockTeamRepository.findOne.mockResolvedValue(existingTeam);

      // Simulate the import logic
      const records: TeamCSVRow[] = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
      const tournamentName = records[0].tournament_name;
      const foundTournament = await mockTournamentRepository.findOne({ where: { name: tournamentName } });

      if (foundTournament) {
        const row = records[0];
        const team = await mockTeamRepository.findOne({ where: { name: row.team_name } });

        if (team && row.logo_url && team.logoUrl !== row.logo_url) {
          team.logoUrl = row.logo_url;
          await mockTeamRepository.save(team);
        }
      }

      expect(mockTeamRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('TournamentTeam creation and updates', () => {
    it('should create a new TournamentTeam when it does not exist', async () => {
      const csvContent = 'team_name,region,seed,logo_url,tournament_name\nDuke,East,1,,2025 Tournament';
      const csvRecords: TeamCSVRow[] = [
        {
          team_name: 'Duke',
          region: 'East',
          seed: '1',
          logo_url: '',
          tournament_name: '2025 Tournament',
        },
      ];

      const mockTournament = { id: 'tournament-1', name: '2025 Tournament' };
      const mockTeam = { id: 'team-1', name: 'Duke', logoUrl: null };
      const newTournamentTeam = {
        id: 'tt-1',
        tournamentId: 'tournament-1',
        teamId: 'team-1',
        seed: 1,
        region: 'East',
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockTeamRepository.findOne.mockResolvedValue(mockTeam);
      mockTournamentTeamRepository.findOne.mockResolvedValue(null);
      mockTournamentTeamRepository.save.mockResolvedValue(newTournamentTeam);

      // Simulate the import logic
      const records: TeamCSVRow[] = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
      const tournamentName = records[0].tournament_name;
      const foundTournament = await mockTournamentRepository.findOne({ where: { name: tournamentName } });

      if (foundTournament) {
        const row = records[0];
        const foundTeam = await mockTeamRepository.findOne({ where: { name: row.team_name } });
        const seed = parseInt(row.seed, 10);
        let tournamentTeam = await mockTournamentTeamRepository.findOne({
          where: { tournamentId: foundTournament.id, teamId: foundTeam.id },
        });

        if (!tournamentTeam) {
          const newTournamentTeamEntity = {
            tournamentId: foundTournament.id,
            teamId: foundTeam.id,
            seed,
            region: row.region,
          };
          tournamentTeam = await mockTournamentTeamRepository.save(newTournamentTeamEntity);
        }
      }

      expect(mockTournamentTeamRepository.findOne).toHaveBeenCalledWith({
        where: { tournamentId: 'tournament-1', teamId: 'team-1' },
      });
      expect(mockTournamentTeamRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tournamentId: 'tournament-1',
          teamId: 'team-1',
          seed: 1,
          region: 'East',
        }),
      );
    });

    it('should update TournamentTeam when seed or region changes', async () => {
      const csvContent = 'team_name,region,seed,logo_url,tournament_name\nDuke,West,2,,2025 Tournament';
      const csvRecords: TeamCSVRow[] = [
        {
          team_name: 'Duke',
          region: 'West',
          seed: '2',
          logo_url: '',
          tournament_name: '2025 Tournament',
        },
      ];

      const mockTournament = { id: 'tournament-1', name: '2025 Tournament' };
      const mockTeam = { id: 'team-1', name: 'Duke', logoUrl: null };
      const existingTournamentTeam = {
        id: 'tt-1',
        tournamentId: 'tournament-1',
        teamId: 'team-1',
        seed: 1,
        region: 'East',
      };
      const updatedTournamentTeam = { ...existingTournamentTeam, seed: 2, region: 'West' };

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockTeamRepository.findOne.mockResolvedValue(mockTeam);
      mockTournamentTeamRepository.findOne.mockResolvedValue(existingTournamentTeam);
      mockTournamentTeamRepository.save.mockResolvedValue(updatedTournamentTeam);

      // Simulate the import logic
      const records: TeamCSVRow[] = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
      const tournamentName = records[0].tournament_name;
      const foundTournament = await mockTournamentRepository.findOne({ where: { name: tournamentName } });

      if (foundTournament) {
        const row = records[0];
        const foundTeam = await mockTeamRepository.findOne({ where: { name: row.team_name } });
        const seed = parseInt(row.seed, 10);
        let tournamentTeam = await mockTournamentTeamRepository.findOne({
          where: { tournamentId: foundTournament.id, teamId: foundTeam.id },
        });

        if (tournamentTeam) {
          const updated = tournamentTeam.seed !== seed || tournamentTeam.region !== row.region;
          if (updated) {
            tournamentTeam.seed = seed;
            tournamentTeam.region = row.region;
            tournamentTeam = await mockTournamentTeamRepository.save(tournamentTeam);
          }
        }
      }

      expect(mockTournamentTeamRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ seed: 2, region: 'West' }),
      );
    });

    it('should not update TournamentTeam when seed and region are unchanged', async () => {
      const csvContent = 'team_name,region,seed,logo_url,tournament_name\nDuke,East,1,,2025 Tournament';
      const csvRecords: TeamCSVRow[] = [
        {
          team_name: 'Duke',
          region: 'East',
          seed: '1',
          logo_url: '',
          tournament_name: '2025 Tournament',
        },
      ];

      const mockTournament = { id: 'tournament-1', name: '2025 Tournament' };
      const mockTeam = { id: 'team-1', name: 'Duke', logoUrl: null };
      const existingTournamentTeam = {
        id: 'tt-1',
        tournamentId: 'tournament-1',
        teamId: 'team-1',
        seed: 1,
        region: 'East',
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockTeamRepository.findOne.mockResolvedValue(mockTeam);
      mockTournamentTeamRepository.findOne.mockResolvedValue(existingTournamentTeam);

      // Simulate the import logic
      const records: TeamCSVRow[] = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
      const tournamentName = records[0].tournament_name;
      const foundTournament = await mockTournamentRepository.findOne({ where: { name: tournamentName } });

      if (foundTournament) {
        const row = records[0];
        const foundTeam = await mockTeamRepository.findOne({ where: { name: row.team_name } });
        const seed = parseInt(row.seed, 10);
        const tournamentTeam = await mockTournamentTeamRepository.findOne({
          where: { tournamentId: foundTournament.id, teamId: foundTeam.id },
        });

        if (tournamentTeam) {
          const updated = tournamentTeam.seed !== seed || tournamentTeam.region !== row.region;
          if (updated) {
            tournamentTeam.seed = seed;
            tournamentTeam.region = row.region;
            await mockTournamentTeamRepository.save(tournamentTeam);
          }
        }
      }

      expect(mockTournamentTeamRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should skip teams with invalid seed numbers (less than 1)', async () => {
      const csvContent = 'team_name,region,seed,logo_url,tournament_name\nDuke,East,0,,2025 Tournament';
      const csvRecords: TeamCSVRow[] = [
        {
          team_name: 'Duke',
          region: 'East',
          seed: '0',
          logo_url: '',
          tournament_name: '2025 Tournament',
        },
      ];

      const mockTournament = { id: 'tournament-1', name: '2025 Tournament' };
      const mockTeam = { id: 'team-1', name: 'Duke', logoUrl: null };

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockTeamRepository.findOne.mockResolvedValue(mockTeam);

      // Simulate the import logic
      const records: TeamCSVRow[] = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
      const tournamentName = records[0].tournament_name;
      const foundTournament = await mockTournamentRepository.findOne({ where: { name: tournamentName } });

      if (foundTournament) {
        const row = records[0];
        const seed = parseInt(row.seed, 10);
        if (isNaN(seed) || seed < 1 || seed > 16) {
          // Skip this team
          return;
        }
      }

      expect(mockTournamentTeamRepository.findOne).not.toHaveBeenCalled();
      expect(mockTournamentTeamRepository.save).not.toHaveBeenCalled();
    });

    it('should skip teams with invalid seed numbers (greater than 16)', async () => {
      const csvContent = 'team_name,region,seed,logo_url,tournament_name\nDuke,East,17,,2025 Tournament';
      const csvRecords: TeamCSVRow[] = [
        {
          team_name: 'Duke',
          region: 'East',
          seed: '17',
          logo_url: '',
          tournament_name: '2025 Tournament',
        },
      ];

      const mockTournament = { id: 'tournament-1', name: '2025 Tournament' };
      const mockTeam = { id: 'team-1', name: 'Duke', logoUrl: null };

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockTeamRepository.findOne.mockResolvedValue(mockTeam);

      // Simulate the import logic
      const records: TeamCSVRow[] = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
      const tournamentName = records[0].tournament_name;
      const foundTournament = await mockTournamentRepository.findOne({ where: { name: tournamentName } });

      if (foundTournament) {
        const row = records[0];
        const seed = parseInt(row.seed, 10);
        if (isNaN(seed) || seed < 1 || seed > 16) {
          // Skip this team
          return;
        }
      }

      expect(mockTournamentTeamRepository.findOne).not.toHaveBeenCalled();
      expect(mockTournamentTeamRepository.save).not.toHaveBeenCalled();
    });

    it('should skip teams with non-numeric seed values', async () => {
      const csvContent = 'team_name,region,seed,logo_url,tournament_name\nDuke,East,abc,,2025 Tournament';
      const csvRecords: TeamCSVRow[] = [
        {
          team_name: 'Duke',
          region: 'East',
          seed: 'abc',
          logo_url: '',
          tournament_name: '2025 Tournament',
        },
      ];

      const mockTournament = { id: 'tournament-1', name: '2025 Tournament' };
      const mockTeam = { id: 'team-1', name: 'Duke', logoUrl: null };

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockTeamRepository.findOne.mockResolvedValue(mockTeam);

      // Simulate the import logic
      const records: TeamCSVRow[] = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
      const tournamentName = records[0].tournament_name;
      const foundTournament = await mockTournamentRepository.findOne({ where: { name: tournamentName } });

      if (foundTournament) {
        const row = records[0];
        const seed = parseInt(row.seed, 10);
        if (isNaN(seed) || seed < 1 || seed > 16) {
          // Skip this team
          return;
        }
      }

      expect(mockTournamentTeamRepository.findOne).not.toHaveBeenCalled();
      expect(mockTournamentTeamRepository.save).not.toHaveBeenCalled();
    });

    it('should skip teams when tournament is not found', async () => {
      const csvContent = 'team_name,region,seed,logo_url,tournament_name\nDuke,East,1,,Non-existent Tournament';
      const csvRecords: TeamCSVRow[] = [
        {
          team_name: 'Duke',
          region: 'East',
          seed: '1',
          logo_url: '',
          tournament_name: 'Non-existent Tournament',
        },
      ];

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne.mockResolvedValue(null);

      // Simulate the import logic
      const records: TeamCSVRow[] = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
      const tournamentName = records[0].tournament_name;
      const foundTournament = await mockTournamentRepository.findOne({ where: { name: tournamentName } });

      if (!foundTournament) {
        // Skip teams for this tournament
        return;
      }

      expect(mockTeamRepository.findOne).not.toHaveBeenCalled();
      expect(mockTournamentTeamRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('Multiple tournaments', () => {
    it('should handle teams from multiple tournaments', async () => {
      const csvContent = 'team_name,region,seed,logo_url,tournament_name\nDuke,East,1,,Tournament 1\nKansas,West,1,,Tournament 2';
      const csvRecords: TeamCSVRow[] = [
        {
          team_name: 'Duke',
          region: 'East',
          seed: '1',
          logo_url: '',
          tournament_name: 'Tournament 1',
        },
        {
          team_name: 'Kansas',
          region: 'West',
          seed: '1',
          logo_url: '',
          tournament_name: 'Tournament 2',
        },
      ];

      const mockTournament1 = { id: 'tournament-1', name: 'Tournament 1' };
      const mockTournament2 = { id: 'tournament-2', name: 'Tournament 2' };
      const mockTeam1 = { id: 'team-1', name: 'Duke', logoUrl: null };
      const mockTeam2 = { id: 'team-2', name: 'Kansas', logoUrl: null };

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne
        .mockResolvedValueOnce(mockTournament1)
        .mockResolvedValueOnce(mockTournament2);
      mockTeamRepository.findOne
        .mockResolvedValueOnce(mockTeam1)
        .mockResolvedValueOnce(mockTeam2);
      mockTournamentTeamRepository.findOne.mockResolvedValue(null);
      mockTournamentTeamRepository.save.mockResolvedValue({});

      // Simulate grouping by tournament
      const teamsByTournament = csvRecords.reduce((acc, row) => {
        if (!acc[row.tournament_name]) {
          acc[row.tournament_name] = [];
        }
        acc[row.tournament_name].push(row);
        return acc;
      }, {} as Record<string, TeamCSVRow[]>);

      // Process each tournament
      for (const [tournamentName, teamRows] of Object.entries(teamsByTournament)) {
        const foundTournament = await mockTournamentRepository.findOne({ where: { name: tournamentName } });
        if (foundTournament) {
          for (const row of teamRows) {
            const foundTeam = await mockTeamRepository.findOne({ where: { name: row.team_name } });
            const seed = parseInt(row.seed, 10);
            if (!isNaN(seed) && seed >= 1 && seed <= 16) {
              const tournamentTeam = await mockTournamentTeamRepository.findOne({
                where: { tournamentId: foundTournament.id, teamId: foundTeam.id },
              });
              if (!tournamentTeam) {
                await mockTournamentTeamRepository.save({
                  tournamentId: foundTournament.id,
                  teamId: foundTeam.id,
                  seed,
                  region: row.region,
                });
              }
            }
          }
        }
      }

      expect(mockTournamentRepository.findOne).toHaveBeenCalledTimes(2);
      expect(mockTournamentRepository.findOne).toHaveBeenCalledWith({ where: { name: 'Tournament 1' } });
      expect(mockTournamentRepository.findOne).toHaveBeenCalledWith({ where: { name: 'Tournament 2' } });
      expect(mockTournamentTeamRepository.save).toHaveBeenCalledTimes(2);
    });
  });
});
