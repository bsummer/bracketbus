import { Injectable } from '@nestjs/common';
import { GamesService } from '../games/games.service';
import { TournamentsService } from './tournaments.service';
import sharp from 'sharp';

interface Game {
  id: string;
  round: number;
  gameNumber: number;
  region: string | null;
  parentGame1Id: string | null;
  parentGame2Id: string | null;
  team1?: any;
  team2?: any;
  winner?: any;
  winnerId: string | null;
  scoreTeam1: number | null;
  scoreTeam2: number | null;
}

interface Tournament {
  id: string;
  name: string;
  startDate: Date;
}

interface GamePosition {
  game: Game;
  x: number;
  y: number;
  round: number;
  region: string;
}

@Injectable()
export class BracketImageService {
  constructor(
    private tournamentsService: TournamentsService,
    private gamesService: GamesService,
  ) {}

  /**
   * Generates an image bracket for a tournament with traditional layout
   * @param tournamentId - Tournament UUID
   * @returns PNG buffer
   */
  async generateTournamentBracketImage(tournamentId: string): Promise<Buffer> {
    const tournament = await this.tournamentsService.findOne(tournamentId);
    const games = await this.gamesService.findAllByTournament(tournamentId);

    // Sort games by round and game number
    const sortedGames = games.sort((a, b) => a.round - b.round || a.gameNumber - b.gameNumber);

    // Generate SVG for the bracket
    const svg = this.generateBracketSVG(tournament, sortedGames);

    // Convert SVG to PNG using sharp (much faster than Puppeteer)
    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();

    return pngBuffer;
  }

  private getTeamsForGame(game: Game, allGames: Game[]): { team1: any; team2: any } {
    if (game.round === 1) {
      return {
        team1: game.team1 ?? null,
        team2: game.team2 ?? null,
      };
    }

    let team1: any = null;
    let team2: any = null;

    if (game.parentGame1Id) {
      const parentGame1 = allGames.find((g) => g.id === game.parentGame1Id);
      if (parentGame1?.winner) {
        team1 = parentGame1.winner;
      }
    }

    if (game.parentGame2Id) {
      const parentGame2 = allGames.find((g) => g.id === game.parentGame2Id);
      if (parentGame2?.winner) {
        team2 = parentGame2.winner;
      }
    }

    return { team1, team2 };
  }

  private calculateGamePositions(games: Game[]): GamePosition[] {
    const positions: GamePosition[] = [];
    
    // Group games by region and round
    const gamesByRegionAndRound: Record<string, Record<number, Game[]>> = {};
    games.forEach((game) => {
      const region = game.round <= 4 && game.region ? game.region : 'center';
      const round = game.round || 0;
      
      if (!gamesByRegionAndRound[region]) {
        gamesByRegionAndRound[region] = {};
      }
      if (!gamesByRegionAndRound[region][round]) {
        gamesByRegionAndRound[region][round] = [];
      }
      gamesByRegionAndRound[region][round].push(game);
    });

    // SVG dimensions
    const width = 2400;
    const height = 1600;
    const padding = 50;
    const regionWidth = (width - padding * 2) / 3;
    const regionHeight = (height - padding * 2) / 2;

    // Region positions
    const regionLayout = {
      East: { startX: padding, startY: padding, width: regionWidth, height: regionHeight },
      West: { startX: padding, startY: padding + regionHeight, width: regionWidth, height: regionHeight },
      South: { startX: padding + regionWidth * 2, startY: padding, width: regionWidth, height: regionHeight },
      Midwest: { startX: padding + regionWidth * 2, startY: padding + regionHeight, width: regionWidth, height: regionHeight },
    };

    const regionOrder = ['East', 'West', 'South', 'Midwest'];

    // Position regional games (rounds 1-4)
    regionOrder.forEach((region) => {
      const regionGames = gamesByRegionAndRound[region];
      if (!regionGames) return;

      const layout = regionLayout[region as keyof typeof regionLayout];
      const rounds = [1, 2, 3, 4];
      const roundWidth = layout.width / 4;

      rounds.forEach((round, roundIdx) => {
        const roundGames = regionGames[round]?.sort((a, b) => a.gameNumber - b.gameNumber) || [];
        const gameHeight = layout.height / Math.max(roundGames.length, 8);
        
        roundGames.forEach((game, gameIdx) => {
          const x = layout.startX + (roundIdx * roundWidth) + (roundWidth / 2);
          const y = layout.startY + (gameIdx * gameHeight) + (gameHeight / 2);
          positions.push({ game, x, y, round, region });
        });
      });
    });

    // Position center games (Final Four and Championship)
    const centerGames = gamesByRegionAndRound['center'];
    if (centerGames) {
      const centerX = padding + regionWidth;
      const centerStartY = height / 2 - 200;

      // Final Four (Round 5)
      const round5Games = centerGames[5]?.sort((a, b) => a.gameNumber - b.gameNumber) || [];
      round5Games.forEach((game, idx) => {
        const y = centerStartY + (idx * 150);
        positions.push({ game, x: centerX, y, round: 5, region: 'center' });
      });

      // Championship (Round 6)
      const round6Games = centerGames[6] || [];
      round6Games.forEach((game) => {
        positions.push({ game, x: centerX, y: centerStartY + 300, round: 6, region: 'center' });
      });
    }

    return positions;
  }

  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private generateBracketSVG(tournament: Tournament, games: Game[]): string {
    const width = 2400;
    const height = 1600;
    const positions = this.calculateGamePositions(games);

    // Group positions by region for rendering
    const positionsByRegion: Record<string, GamePosition[]> = {};
    positions.forEach((pos) => {
      if (!positionsByRegion[pos.region]) {
        positionsByRegion[pos.region] = [];
      }
      positionsByRegion[pos.region].push(pos);
    });

    const regionMap: Record<string, string> = {
      'East': 'North',
      'West': 'West',
      'South': 'East',
      'Midwest': 'Midwest',
    };

    const renderGame = (pos: GamePosition): string => {
      const { team1, team2 } = this.getTeamsForGame(pos.game, games);
      const isTeam1Winner = pos.game.winnerId === team1?.id;
      const isTeam2Winner = pos.game.winnerId === team2?.id;

      const seed1 = team1 && 'seed' in team1 ? (team1 as any).seed : null;
      const seed2 = team2 && 'seed' in team2 ? (team2 as any).seed : null;
      const score1 = pos.game.scoreTeam1 ?? '';
      const score2 = pos.game.scoreTeam2 ?? '';

      const gameBoxWidth = pos.round === 6 ? 250 : 180;
      const gameBoxHeight = pos.round === 6 ? 80 : 50;
      const gameX = pos.x - gameBoxWidth / 2;
      const gameY = pos.y - gameBoxHeight / 2;
      const fontSize = pos.round === 6 ? 14 : 11;
      const lineHeight = pos.round === 6 ? 18 : 13;

      const team1Text = team1 ? this.escapeXml(team1.name) : 'TBD';
      const team2Text = team2 ? this.escapeXml(team2.name) : 'TBD';

      const team1Fill = isTeam1Winner ? '#e8f5e9' : 'white';
      const team2Fill = isTeam2Winner ? '#e8f5e9' : 'white';
      const fontWeight = (isTeam1Winner || isTeam2Winner) ? 'bold' : 'normal';

      let team1Content = '';
      if (seed1) {
        team1Content += `<tspan font-weight="bold" fill="#666">${seed1}</tspan><tspan dx="5"> </tspan>`;
      }
      team1Content += `<tspan>${team1Text}</tspan>`;
      if (score1) {
        team1Content += `<tspan dx="10"> </tspan><tspan font-weight="bold">${score1}</tspan>`;
      }

      let team2Content = '';
      if (seed2) {
        team2Content += `<tspan font-weight="bold" fill="#666">${seed2}</tspan><tspan dx="5"> </tspan>`;
      }
      team2Content += `<tspan>${team2Text}</tspan>`;
      if (score2) {
        team2Content += `<tspan dx="10"> </tspan><tspan font-weight="bold">${score2}</tspan>`;
      }

      return `
        <g transform="translate(${gameX},${gameY})">
          <rect x="0" y="0" width="${gameBoxWidth}" height="${gameBoxHeight}" 
                stroke="#333" stroke-width="${pos.round === 6 ? 3 : 2}" fill="white" rx="3"/>
          <rect x="0" y="0" width="${gameBoxWidth}" height="${gameBoxHeight / 2}" 
                fill="${team1Fill}"/>
          <rect x="0" y="${gameBoxHeight / 2}" width="${gameBoxWidth}" height="${gameBoxHeight / 2}" 
                fill="${team2Fill}"/>
          <line x1="0" y1="${gameBoxHeight / 2}" x2="${gameBoxWidth}" y2="${gameBoxHeight / 2}" stroke="#ddd" stroke-width="1"/>
          
          <text x="5" y="${lineHeight}" font-size="${fontSize}" font-family="Arial" fill="#333" font-weight="${team1 && isTeam1Winner ? 'bold' : 'normal'}">
            ${team1Content}
          </text>
          
          <text x="5" y="${gameBoxHeight / 2 + lineHeight}" font-size="${fontSize}" font-family="Arial" fill="#333" font-weight="${team2 && isTeam2Winner ? 'bold' : 'normal'}">
            ${team2Content}
          </text>
        </g>
      `;
    };

    const renderRegionTitle = (region: string, x: number, y: number): string => {
      const displayRegion = regionMap[region] || region;
      return `
        <text x="${x}" y="${y}" font-size="18" font-weight="bold" font-family="Arial" fill="#333" text-anchor="middle">
          ${this.escapeXml(displayRegion)} Region
        </text>
      `;
    };

    const regionTitles: string[] = [];
    const regionLayout = {
      East: { x: 250, y: 50 },
      West: { x: 250, y: 850 },
      South: { x: 2150, y: 50 },
      Midwest: { x: 2150, y: 850 },
    };

    ['East', 'West', 'South', 'Midwest'].forEach((region) => {
      if (positionsByRegion[region]) {
        const layout = regionLayout[region as keyof typeof regionLayout];
        regionTitles.push(renderRegionTitle(region, layout.x, layout.y));
      }
    });

    const centerTitles = `
      <text x="1200" y="600" font-size="24" font-weight="bold" font-family="Arial" fill="#333" text-anchor="middle">FINAL FOUR</text>
      <text x="1200" y="1050" font-size="24" font-weight="bold" font-family="Arial" fill="#333" text-anchor="middle">CHAMPIONSHIP</text>
    `;

    return `<?xml version="1.0" encoding="UTF-8"?>
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .region-title { font-size: 18px; font-weight: bold; fill: #333; }
          </style>
        </defs>
        
        <rect width="${width}" height="${height}" fill="white"/>
        
        <text x="${width / 2}" y="40" font-size="32" font-weight="bold" font-family="Arial" fill="#333" text-anchor="middle">
          ${this.escapeXml(tournament.name)}
        </text>
        
        ${regionTitles.join('')}
        ${centerTitles}
        
        ${positions.map(renderGame).join('')}
        
        <!-- Connecting lines would go here for bracket visualization -->
      </svg>
    `;
  }
}
