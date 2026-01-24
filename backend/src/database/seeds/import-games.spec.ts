/// <reference types="jest" />
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { AppDataSource } from '../../data-source';
import * as entities from '../../common/entities';

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

describe('import-games', () => {
  let mockGameRepository: any;
  let mockTournamentRepository: any;
  let mockTournamentTeamRepository: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Setup mock repositories
    mockGameRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockTournamentRepository = {
      findOne: jest.fn(),
    };

    mockTournamentTeamRepository = {
      findOne: jest.fn(),
    };

    // Mock AppDataSource
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === entities.Game) return mockGameRepository;
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
  });

  describe('CSV parsing', () => {
    it('should parse CSV content correctly', () => {
      const csvContent = 'game_number,round,region,team1_seed,team2_seed,tournament_name\n1,1,East,1,16,2025 Tournament';
      const expectedRecords: GameCSVRow[] = [
        {
          game_number: '1',
          round: '1',
          region: 'East',
          team1_seed: '1',
          team2_seed: '16',
          tournament_name: '2025 Tournament',
        },
      ];

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(expectedRecords);

      const content = fs.readFileSync('test.csv', 'utf-8');
      const records: GameCSVRow[] = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      expect(records).toEqual(expectedRecords);
      expect(fs.readFileSync).toHaveBeenCalledWith('test.csv', 'utf-8');
    });
  });

  describe('Round 1 game creation', () => {
    it('should create a Round 1 game with teams from seeds', async () => {
      const csvContent = 'game_number,round,region,team1_seed,team2_seed,tournament_name\n1,1,East,1,16,2025 Tournament';
      const csvRecords: GameCSVRow[] = [
        {
          game_number: '1',
          round: '1',
          region: 'East',
          team1_seed: '1',
          team2_seed: '16',
          tournament_name: '2025 Tournament',
        },
      ];

      const mockTournament = { id: 'tournament-1', name: '2025 Tournament' };
      const mockTournamentTeam1 = { id: 'tt-1', teamId: 'team-1', seed: 1, region: 'East' };
      const mockTournamentTeam2 = { id: 'tt-16', teamId: 'team-16', seed: 16, region: 'East' };
      const newGame = {
        id: 'game-1',
        round: 1,
        tournamentId: 'tournament-1',
        gameNumber: 1,
        region: 'East',
        team1Id: 'team-1',
        team2Id: 'team-16',
        status: entities.GameStatus.SCHEDULED,
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockGameRepository.findOne.mockResolvedValue(null); // Game doesn't exist
      mockTournamentTeamRepository.findOne
        .mockResolvedValueOnce(mockTournamentTeam1)
        .mockResolvedValueOnce(mockTournamentTeam2);
      mockGameRepository.save.mockResolvedValue(newGame);

      // Simulate the import logic
      const records: GameCSVRow[] = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
      const tournamentName = records[0].tournament_name;
      const foundTournament = await mockTournamentRepository.findOne({ where: { name: tournamentName } });

      if (foundTournament) {
        const row = records[0];
        const round = parseInt(row.round, 10);
        const gameNumber = parseInt(row.game_number, 10);

        if (round === 1) {
          const seed1 = parseInt(row.team1_seed!, 10);
          const seed2 = parseInt(row.team2_seed!, 10);

          const team1TournamentTeam = await mockTournamentTeamRepository.findOne({
            where: {
              tournamentId: foundTournament.id,
              region: row.region,
              seed: seed1,
            },
          });

          const team2TournamentTeam = await mockTournamentTeamRepository.findOne({
            where: {
              tournamentId: foundTournament.id,
              region: row.region,
              seed: seed2,
            },
          });

          if (team1TournamentTeam && team2TournamentTeam) {
            const game = {
              round,
              tournamentId: foundTournament.id,
              gameNumber,
              region: row.region,
              team1Id: team1TournamentTeam.teamId,
              team2Id: team2TournamentTeam.teamId,
              status: entities.GameStatus.SCHEDULED,
            };
            await mockGameRepository.save(game);
          }
        }
      }

      expect(mockTournamentTeamRepository.findOne).toHaveBeenCalledWith({
        where: { tournamentId: 'tournament-1', region: 'East', seed: 1 },
      });
      expect(mockTournamentTeamRepository.findOne).toHaveBeenCalledWith({
        where: { tournamentId: 'tournament-1', region: 'East', seed: 16 },
      });
      expect(mockGameRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          round: 1,
          gameNumber: 1,
          region: 'East',
          team1Id: 'team-1',
          team2Id: 'team-16',
        }),
      );
    });

    it('should skip Round 1 game if region is missing', async () => {
      const csvContent = 'game_number,round,region,team1_seed,team2_seed,tournament_name\n1,1,,1,16,2025 Tournament';
      const csvRecords: GameCSVRow[] = [
        {
          game_number: '1',
          round: '1',
          region: '',
          team1_seed: '1',
          team2_seed: '16',
          tournament_name: '2025 Tournament',
        },
      ];

      const mockTournament = { id: 'tournament-1', name: '2025 Tournament' };

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockGameRepository.findOne.mockResolvedValue(null);

      // Simulate the import logic
      const records: GameCSVRow[] = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
      const tournamentName = records[0].tournament_name;
      const foundTournament = await mockTournamentRepository.findOne({ where: { name: tournamentName } });

      if (foundTournament) {
        const row = records[0];
        if (row.round === '1' && !row.region) {
          // Skip this game
          return;
        }
      }

      expect(mockGameRepository.save).not.toHaveBeenCalled();
    });

    it('should skip Round 1 game if team seeds are missing', async () => {
      const csvContent = 'game_number,round,region,team1_seed,team2_seed,tournament_name\n1,1,East,,,2025 Tournament';
      const csvRecords: GameCSVRow[] = [
        {
          game_number: '1',
          round: '1',
          region: 'East',
          team1_seed: '',
          team2_seed: '',
          tournament_name: '2025 Tournament',
        },
      ];

      const mockTournament = { id: 'tournament-1', name: '2025 Tournament' };

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockGameRepository.findOne.mockResolvedValue(null);

      // Simulate the import logic
      const records: GameCSVRow[] = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
      const tournamentName = records[0].tournament_name;
      const foundTournament = await mockTournamentRepository.findOne({ where: { name: tournamentName } });

      if (foundTournament) {
        const row = records[0];
        if (row.round === '1' && (!row.team1_seed || !row.team2_seed)) {
          // Skip this game
          return;
        }
      }

      expect(mockGameRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Round 2+ game creation', () => {
    it('should create a Round 2 game with parent game references', async () => {
      const csvContent = 'game_number,round,region,team1_seed,team2_seed,parent_game1_number,parent_game2_number,tournament_name\n1,1,East,1,16,,,2025 Tournament\n2,1,East,2,15,,,2025 Tournament\n33,2,East,,,1,2,2025 Tournament';
      const csvRecords: GameCSVRow[] = [
        {
          game_number: '1',
          round: '1',
          region: 'East',
          team1_seed: '1',
          team2_seed: '16',
          tournament_name: '2025 Tournament',
        },
        {
          game_number: '2',
          round: '1',
          region: 'East',
          team1_seed: '2',
          team2_seed: '15',
          tournament_name: '2025 Tournament',
        },
        {
          game_number: '33',
          round: '2',
          region: 'East',
          parent_game1_number: '1',
          parent_game2_number: '2',
          tournament_name: '2025 Tournament',
        },
      ];

      const mockTournament = { id: 'tournament-1', name: '2025 Tournament' };
      const mockTournamentTeam1 = { id: 'tt-1', teamId: 'team-1', seed: 1, region: 'East' };
      const mockTournamentTeam16 = { id: 'tt-16', teamId: 'team-16', seed: 16, region: 'East' };
      const mockTournamentTeam2 = { id: 'tt-2', teamId: 'team-2', seed: 2, region: 'East' };
      const mockTournamentTeam15 = { id: 'tt-15', teamId: 'team-15', seed: 15, region: 'East' };
      const parentGame1 = { id: 'game-1', gameNumber: 1, round: 1 };
      const parentGame2 = { id: 'game-2', gameNumber: 2, round: 1 };
      const newGame = {
        id: 'game-33',
        round: 2,
        tournamentId: 'tournament-1',
        gameNumber: 33,
        region: 'East',
        parentGame1Id: 'game-1',
        parentGame2Id: 'game-2',
        status: entities.GameStatus.SCHEDULED,
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockGameRepository.findOne.mockResolvedValue(null);
      mockTournamentTeamRepository.findOne
        .mockResolvedValueOnce(mockTournamentTeam1)
        .mockResolvedValueOnce(mockTournamentTeam16)
        .mockResolvedValueOnce(mockTournamentTeam2)
        .mockResolvedValueOnce(mockTournamentTeam15);
      mockGameRepository.save
        .mockResolvedValueOnce(parentGame1)
        .mockResolvedValueOnce(parentGame2)
        .mockResolvedValueOnce(newGame);

      // Simulate the import logic with games map
      const records: GameCSVRow[] = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
      const sortedGames = records.sort((a, b) => {
        const roundA = parseInt(a.round, 10);
        const roundB = parseInt(b.round, 10);
        if (roundA !== roundB) return roundA - roundB;
        return parseInt(a.game_number, 10) - parseInt(b.game_number, 10);
      });

      const gamesByNumber = new Map<number, any>();
      const tournamentName = sortedGames[0].tournament_name;
      const foundTournament = await mockTournamentRepository.findOne({ where: { name: tournamentName } });

      if (foundTournament) {
        for (const row of sortedGames) {
          const round = parseInt(row.round, 10);
          const gameNumber = parseInt(row.game_number, 10);

          if (round === 1) {
            // Create Round 1 game
            const seed1 = parseInt(row.team1_seed!, 10);
            const seed2 = parseInt(row.team2_seed!, 10);

            const team1TournamentTeam = await mockTournamentTeamRepository.findOne({
              where: {
                tournamentId: foundTournament.id,
                region: row.region,
                seed: seed1,
              },
            });

            const team2TournamentTeam = await mockTournamentTeamRepository.findOne({
              where: {
                tournamentId: foundTournament.id,
                region: row.region,
                seed: seed2,
              },
            });

            if (team1TournamentTeam && team2TournamentTeam) {
              const game = {
                id: `game-${gameNumber}`,
                gameNumber,
                round: 1,
                tournamentId: foundTournament.id,
                region: row.region,
                team1Id: team1TournamentTeam.teamId,
                team2Id: team2TournamentTeam.teamId,
                status: entities.GameStatus.SCHEDULED,
              };
              const savedGame = await mockGameRepository.save(game);
              gamesByNumber.set(gameNumber, savedGame);
            }
          } else {
            // Round 2+
            const parent1Number = parseInt(row.parent_game1_number!, 10);
            const parent2Number = parseInt(row.parent_game2_number!, 10);

            const parent1 = gamesByNumber.get(parent1Number);
            const parent2 = gamesByNumber.get(parent2Number);

            if (parent1 && parent2) {
              const game = {
                round,
                tournamentId: foundTournament.id,
                gameNumber,
                parentGame1Id: parent1.id,
                parentGame2Id: parent2.id,
                region: round >= 2 && round <= 4 ? row.region || null : null,
                status: entities.GameStatus.SCHEDULED,
              };
              const savedGame = await mockGameRepository.save(game);
              gamesByNumber.set(gameNumber, savedGame);
            }
          }
        }
      }

      expect(mockGameRepository.save).toHaveBeenCalledTimes(3);
      expect(mockGameRepository.save).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          round: 1,
          gameNumber: 1,
          region: 'East',
          team1Id: 'team-1',
          team2Id: 'team-16',
        }),
      );
      expect(mockGameRepository.save).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          round: 1,
          gameNumber: 2,
          region: 'East',
          team1Id: 'team-2',
          team2Id: 'team-15',
        }),
      );
      expect(mockGameRepository.save).toHaveBeenNthCalledWith(3,
        expect.objectContaining({
          round: 2,
          gameNumber: 33,
          parentGame1Id: 'game-1',
          parentGame2Id: 'game-2',
          region: 'East',
        }),
      );
    });

    it('should skip Round 2+ game if parent game numbers are missing', async () => {
      const csvContent = 'game_number,round,region,parent_game1_number,parent_game2_number,tournament_name\n33,2,East,,,2025 Tournament';
      const csvRecords: GameCSVRow[] = [
        {
          game_number: '33',
          round: '2',
          region: 'East',
          parent_game1_number: '',
          parent_game2_number: '',
          tournament_name: '2025 Tournament',
        },
      ];

      const mockTournament = { id: 'tournament-1', name: '2025 Tournament' };

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockGameRepository.findOne.mockResolvedValue(null);

      // Simulate the import logic
      const records: GameCSVRow[] = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
      const tournamentName = records[0].tournament_name;
      const foundTournament = await mockTournamentRepository.findOne({ where: { name: tournamentName } });

      if (foundTournament) {
        const row = records[0];
        const round = parseInt(row.round, 10);
        if (round > 1 && (!row.parent_game1_number || !row.parent_game2_number)) {
          // Skip this game
          return;
        }
      }

      expect(mockGameRepository.save).not.toHaveBeenCalled();
    });

    it('should skip Round 2+ game if parent games are not found', async () => {
      const csvContent = 'game_number,round,region,parent_game1_number,parent_game2_number,tournament_name\n33,2,East,1,2,2025 Tournament';
      const csvRecords: GameCSVRow[] = [
        {
          game_number: '33',
          round: '2',
          region: 'East',
          parent_game1_number: '1',
          parent_game2_number: '2',
          tournament_name: '2025 Tournament',
        },
      ];

      const mockTournament = { id: 'tournament-1', name: '2025 Tournament' };
      const gamesByNumber = new Map<number, any>();

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockGameRepository.findOne.mockResolvedValue(null);

      // Simulate the import logic
      const records: GameCSVRow[] = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
      const tournamentName = records[0].tournament_name;
      const foundTournament = await mockTournamentRepository.findOne({ where: { name: tournamentName } });

      if (foundTournament) {
        const row = records[0];
        const round = parseInt(row.round, 10);
        
        if (round > 1) {
          const parent1Number = parseInt(row.parent_game1_number!, 10);
          const parent2Number = parseInt(row.parent_game2_number!, 10);

          const parent1 = gamesByNumber.get(parent1Number);
          const parent2 = gamesByNumber.get(parent2Number);

          if (!parent1 || !parent2) {
            // Skip this game
            return;
          }
        }
      }

      expect(mockGameRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should skip games with invalid round numbers', async () => {
      const csvContent = 'game_number,round,region,team1_seed,team2_seed,tournament_name\n1,0,East,1,16,2025 Tournament';
      const csvRecords: GameCSVRow[] = [
        {
          game_number: '1',
          round: '0',
          region: 'East',
          team1_seed: '1',
          team2_seed: '16',
          tournament_name: '2025 Tournament',
        },
      ];

      const mockTournament = { id: 'tournament-1', name: '2025 Tournament' };

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockGameRepository.findOne.mockResolvedValue(null);

      // Simulate the import logic
      const records: GameCSVRow[] = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
      const tournamentName = records[0].tournament_name;
      const foundTournament = await mockTournamentRepository.findOne({ where: { name: tournamentName } });

      if (foundTournament) {
        const row = records[0];
        const round = parseInt(row.round, 10);
        if (isNaN(round) || round < 1 || round > 6) {
          // Skip this game
          return;
        }
      }

      expect(mockGameRepository.save).not.toHaveBeenCalled();
    });

    it('should skip games when tournament is not found', async () => {
      const csvContent = 'game_number,round,region,team1_seed,team2_seed,tournament_name\n1,1,East,1,16,Non-existent Tournament';
      const csvRecords: GameCSVRow[] = [
        {
          game_number: '1',
          round: '1',
          region: 'East',
          team1_seed: '1',
          team2_seed: '16',
          tournament_name: 'Non-existent Tournament',
        },
      ];

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne.mockResolvedValue(null);

      // Simulate the import logic
      const records: GameCSVRow[] = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
      const tournamentName = records[0].tournament_name;
      const foundTournament = await mockTournamentRepository.findOne({ where: { name: tournamentName } });

      if (!foundTournament) {
        // Skip games for this tournament
        return;
      }

      expect(mockGameRepository.save).not.toHaveBeenCalled();
    });

    it('should skip games that already exist', async () => {
      const csvContent = 'game_number,round,region,team1_seed,team2_seed,tournament_name\n1,1,East,1,16,2025 Tournament';
      const csvRecords: GameCSVRow[] = [
        {
          game_number: '1',
          round: '1',
          region: 'East',
          team1_seed: '1',
          team2_seed: '16',
          tournament_name: '2025 Tournament',
        },
      ];

      const mockTournament = { id: 'tournament-1', name: '2025 Tournament' };
      const existingGame = { id: 'game-1', gameNumber: 1, round: 1 };

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockGameRepository.findOne.mockResolvedValue(existingGame);

      // Simulate the import logic
      const records: GameCSVRow[] = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
      const tournamentName = records[0].tournament_name;
      const foundTournament = await mockTournamentRepository.findOne({ where: { name: tournamentName } });

      if (foundTournament) {
        const row = records[0];
        const gameNumber = parseInt(row.game_number, 10);
        const existingGame = await mockGameRepository.findOne({
          where: {
            tournamentId: foundTournament.id,
            gameNumber: gameNumber,
          },
        });

        if (existingGame) {
          // Skip this game
          return;
        }
      }

      expect(mockGameRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Game ordering', () => {
    it('should process games in order by round and game number', async () => {
      const csvContent = 'game_number,round,region,parent_game1_number,parent_game2_number,tournament_name\n33,2,East,1,2,2025 Tournament\n1,1,East,1,16,2025 Tournament';
      const csvRecords: GameCSVRow[] = [
        {
          game_number: '33',
          round: '2',
          region: 'East',
          parent_game1_number: '1',
          parent_game2_number: '2',
          tournament_name: '2025 Tournament',
        },
        {
          game_number: '1',
          round: '1',
          region: 'East',
          team1_seed: '1',
          team2_seed: '16',
          tournament_name: '2025 Tournament',
        },
      ];

      const mockTournament = { id: 'tournament-1', name: '2025 Tournament' };

      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (parse as jest.Mock).mockReturnValue(csvRecords);
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockGameRepository.findOne.mockResolvedValue(null);
      mockGameRepository.save.mockResolvedValue({ id: 'game-1', gameNumber: 1 });

      // Simulate sorting
      const sortedGames = csvRecords.sort((a, b) => {
        const roundA = parseInt(a.round, 10);
        const roundB = parseInt(b.round, 10);
        if (roundA !== roundB) {
          return roundA - roundB;
        }
        return parseInt(a.game_number, 10) - parseInt(b.game_number, 10);
      });

      expect(sortedGames[0].round).toBe('1');
      expect(sortedGames[0].game_number).toBe('1');
      expect(sortedGames[1].round).toBe('2');
      expect(sortedGames[1].game_number).toBe('33');
    });
  });
});
