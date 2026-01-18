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

    // SVG dimensions - larger to match traditional bracket
    const width = 2400;
    const height = 1600;
    const padding = 40;
    
    // Calculate region dimensions - regions take outer portions, center takes middle
    const leftRegionWidth = 550;
    const centerWidth = 700;
    const rightRegionWidth = 550;
    const regionHeight = (height - padding * 2) / 2;

    // Region positions matching traditional bracket layout
    const regionLayout = {
      East: { startX: padding, startY: padding + 80, width: leftRegionWidth, height: regionHeight - 80 },
      West: { startX: padding, startY: padding + regionHeight + 80, width: leftRegionWidth, height: regionHeight - 80 },
      South: { startX: padding + leftRegionWidth + centerWidth, startY: padding + 80, width: rightRegionWidth, height: regionHeight - 80 },
      Midwest: { startX: padding + leftRegionWidth + centerWidth, startY: padding + regionHeight + 80, width: rightRegionWidth, height: regionHeight - 80 },
    };

    const regionOrder = ['East', 'West', 'South', 'Midwest'];
    const rightSideRegions = ['South', 'Midwest'];

    // Helper to calculate game Y position based on bracket structure
    const calculateGameY = (round: number, gameIdx: number, totalGames: number): number => {
      // Round 1 has 8 games per region
      // Each subsequent round halves the number of games
      const gamesInRound1 = 8;
      const gamesInThisRound = totalGames;
      
      // Calculate spacing - games get closer together as rounds progress
      const baseSpacing = 70; // Base spacing between games in round 1
      const spacing = baseSpacing / Math.pow(2, round - 1);
      
      // Calculate starting position to center games vertically
      const totalHeight = (gamesInRound1 - 1) * baseSpacing;
      const roundHeight = (gamesInThisRound - 1) * spacing;
      const startY = (totalHeight - roundHeight) / 2;
      
      return startY + (gameIdx * spacing);
    };

    // Position regional games (rounds 1-4)
    regionOrder.forEach((region) => {
      const regionGames = gamesByRegionAndRound[region];
      if (!regionGames) return;

      const layout = regionLayout[region as keyof typeof regionLayout];
      const rounds = [1, 2, 3, 4];
      const roundWidth = layout.width / 4.5; // Slightly less than 4 to account for spacing
      const isRightSide = rightSideRegions.includes(region);
      const maxGamesInRound1 = 8;

      rounds.forEach((round, roundIdx) => {
        const roundGames = regionGames[round]?.sort((a, b) => a.gameNumber - b.gameNumber) || [];
        
        roundGames.forEach((game, gameIdx) => {
          let x: number;
          if (isRightSide) {
            // Right side: round 1 on far right, progress left
            // Round 1 (roundIdx=0): x = startX + width - 0.45*roundWidth (far right)
            // Round 2 (roundIdx=1): x = startX + width - 1.45*roundWidth (left of round 1)
            // Round 3 (roundIdx=2): x = startX + width - 2.45*roundWidth (left of round 2)
            // Round 4 (roundIdx=3): x = startX + width - 3.45*roundWidth (left of round 3, closest to center)
            x = layout.startX + layout.width - (roundIdx * roundWidth) - (roundWidth * 0.45);
          } else {
            // Left side: round 1 on far left, progress right
            x = layout.startX + (roundIdx * roundWidth) + (roundWidth * 0.45);
          }
          
          const y = layout.startY + calculateGameY(round, gameIdx, roundGames.length);
          positions.push({ game, x, y, round, region });
        });
      });
    });

    // Position center games (Final Four and Championship)
    const centerGames = gamesByRegionAndRound['center'];
    if (centerGames) {
      const centerX = padding + leftRegionWidth + (centerWidth / 2);
      const centerTop = height / 2 - 150;
      const centerBottom = height / 2 + 150;

      // Final Four (Round 5) - two games vertically stacked
      const round5Games = centerGames[5]?.sort((a, b) => a.gameNumber - b.gameNumber) || [];
      round5Games.forEach((game, idx) => {
        const y = centerTop + (idx * 200);
        positions.push({ game, x: centerX, y, round: 5, region: 'center' });
      });

      // Championship (Round 6) - single game in center
      const round6Games = centerGames[6] || [];
      round6Games.forEach((game) => {
        positions.push({ game, x: centerX, y: centerBottom, round: 6, region: 'center' });
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
    const padding = 40;
    const leftRegionWidth = 550;
    const centerWidth = 700;
    const rightRegionWidth = 550;
    const regionHeight = (height - padding * 2) / 2;
    
    const positions = this.calculateGamePositions(games);

    // Group positions by region for rendering
    const positionsByRegion: Record<string, GamePosition[]> = {};
    positions.forEach((pos) => {
      if (!positionsByRegion[pos.region]) {
        positionsByRegion[pos.region] = [];
      }
      positionsByRegion[pos.region].push(pos);
    });

    // Map regions to display names (matching traditional bracket)
    const regionMap: Record<string, string> = {
      'East': 'North',  // Top-left region shown as North
      'West': 'West',   // Bottom-left region
      'South': 'East',  // Top-right region shown as East
      'Midwest': 'Midwest', // Bottom-right region
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

    // Calculate center positions based on new layout
    const centerX = padding + leftRegionWidth + (centerWidth / 2);
    const centerTitles = `
      <text x="${centerX}" y="${height / 2 - 100}" font-size="24" font-weight="bold" font-family="Arial" fill="#333" text-anchor="middle">FINAL FOUR</text>
      <text x="${centerX}" y="${height / 2 + 200}" font-size="24" font-weight="bold" font-family="Arial" fill="#333" text-anchor="middle">CHAMPIONSHIP</text>
    `;

    // Render connecting lines between games
    const renderConnectingLines = (): string => {
      const lines: string[] = [];
      const gameBoxWidth = 180;
      const gameBoxHeight = 50;
      const rightSideRegions = ['South', 'Midwest'];
      const centerX = padding + leftRegionWidth + (centerWidth / 2);

      positions.forEach((pos) => {
        const game = pos.game;
        const isRightSide = rightSideRegions.includes(pos.region);
        const isCenter = pos.region === 'center';
        const gameBoxW = pos.round === 6 ? 250 : gameBoxWidth;
        const gameBoxH = pos.round === 6 ? 80 : gameBoxHeight;
        
        // Connect to child game (next round)
        if (game.parentGame1Id || game.parentGame2Id) {
          // This game is a child, find parent positions
          if (game.parentGame1Id) {
            const parent1Pos = positions.find(p => p.game.id === game.parentGame1Id);
            if (parent1Pos) {
              const parentBoxW = parent1Pos.round === 6 ? 250 : gameBoxWidth;
              const parentBoxH = parent1Pos.round === 6 ? 80 : gameBoxHeight;
              const parentIsRight = rightSideRegions.includes(parent1Pos.region);
              const parentIsCenter = parent1Pos.region === 'center';
              
              // Calculate start point (parent game bottom)
              let parentStartX: number;
              let parentStartY = parent1Pos.y + parentBoxH / 2;
              
              if (parentIsRight) {
                parentStartX = parent1Pos.x - parentBoxW / 2; // Left edge for right regions
              } else if (parentIsCenter) {
                parentStartX = parent1Pos.x; // Center for center games
              } else {
                parentStartX = parent1Pos.x + parentBoxW / 2; // Right edge for left regions
              }
              
              // Calculate end point (child game top)
              let childEndX: number;
              let childEndY = pos.y - gameBoxH / 2;
              
              if (isRightSide) {
                childEndX = pos.x + gameBoxW / 2; // Right edge for right regions
              } else if (isCenter) {
                childEndX = pos.x; // Center for center games
              } else {
                childEndX = pos.x - gameBoxW / 2; // Left edge for left regions
              }
              
              // Draw connecting line with horizontal segment in middle
              if (isCenter || parentIsCenter) {
                // Vertical line for center games
                const midY = (parentStartY + childEndY) / 2;
                lines.push(`<path d="M ${parentStartX} ${parentStartY} L ${parentStartX} ${midY} L ${childEndX} ${midY} L ${childEndX} ${childEndY}" stroke="#999" stroke-width="2" fill="none"/>`);
              } else if (isRightSide || parentIsRight) {
                // Right side: horizontal line going left
                const midX = Math.min(parentStartX, childEndX) - 60;
                lines.push(`<path d="M ${parentStartX} ${parentStartY} L ${midX} ${parentStartY} L ${midX} ${childEndY} L ${childEndX} ${childEndY}" stroke="#999" stroke-width="2" fill="none"/>`);
              } else {
                // Left side: horizontal line going right
                const midX = Math.max(parentStartX, childEndX) + 60;
                lines.push(`<path d="M ${parentStartX} ${parentStartY} L ${midX} ${parentStartY} L ${midX} ${childEndY} L ${childEndX} ${childEndY}" stroke="#999" stroke-width="2" fill="none"/>`);
              }
            }
          }
          
          if (game.parentGame2Id) {
            const parent2Pos = positions.find(p => p.game.id === game.parentGame2Id);
            if (parent2Pos) {
              const parentBoxW = parent2Pos.round === 6 ? 250 : gameBoxWidth;
              const parentBoxH = parent2Pos.round === 6 ? 80 : gameBoxHeight;
              const parentIsRight = rightSideRegions.includes(parent2Pos.region);
              const parentIsCenter = parent2Pos.region === 'center';
              
              // Calculate start point (parent game bottom)
              let parentStartX: number;
              let parentStartY = parent2Pos.y + parentBoxH / 2;
              
              if (parentIsRight) {
                parentStartX = parent2Pos.x - parentBoxW / 2; // Left edge for right regions
              } else if (parentIsCenter) {
                parentStartX = parent2Pos.x; // Center for center games
              } else {
                parentStartX = parent2Pos.x + parentBoxW / 2; // Right edge for left regions
              }
              
              // Calculate end point (child game top)
              let childEndX: number;
              let childEndY = pos.y - gameBoxH / 2;
              
              if (isRightSide) {
                childEndX = pos.x + gameBoxW / 2; // Right edge for right regions
              } else if (isCenter) {
                childEndX = pos.x; // Center for center games
              } else {
                childEndX = pos.x - gameBoxW / 2; // Left edge for left regions
              }
              
              // Draw connecting line with horizontal segment in middle
              if (isCenter || parentIsCenter) {
                // Vertical line for center games
                const midY = (parentStartY + childEndY) / 2;
                lines.push(`<path d="M ${parentStartX} ${parentStartY} L ${parentStartX} ${midY} L ${childEndX} ${midY} L ${childEndX} ${childEndY}" stroke="#999" stroke-width="2" fill="none"/>`);
              } else if (isRightSide || parentIsRight) {
                // Right side: horizontal line going left
                const midX = Math.min(parentStartX, childEndX) - 60;
                lines.push(`<path d="M ${parentStartX} ${parentStartY} L ${midX} ${parentStartY} L ${midX} ${childEndY} L ${childEndX} ${childEndY}" stroke="#999" stroke-width="2" fill="none"/>`);
              } else {
                // Left side: horizontal line going right
                const midX = Math.max(parentStartX, childEndX) + 60;
                lines.push(`<path d="M ${parentStartX} ${parentStartY} L ${midX} ${parentStartY} L ${midX} ${childEndY} L ${childEndX} ${childEndY}" stroke="#999" stroke-width="2" fill="none"/>`);
              }
            }
          }
        }
      });

      return lines.join('');
    };

    // Update region title positions based on new layout
    const regionTitleLayout = {
      East: { x: padding + leftRegionWidth / 2, y: padding + 60 },
      West: { x: padding + leftRegionWidth / 2, y: padding + regionHeight + 60 },
      South: { x: padding + leftRegionWidth + centerWidth + rightRegionWidth / 2, y: padding + 60 },
      Midwest: { x: padding + leftRegionWidth + centerWidth + rightRegionWidth / 2, y: padding + regionHeight + 60 },
    };

    const updatedRegionTitles: string[] = [];
    ['East', 'West', 'South', 'Midwest'].forEach((region) => {
      if (positionsByRegion[region]) {
        const layout = regionTitleLayout[region as keyof typeof regionTitleLayout];
        updatedRegionTitles.push(renderRegionTitle(region, layout.x, layout.y));
      }
    });

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
        
        ${updatedRegionTitles.join('')}
        ${centerTitles}
        
        ${renderConnectingLines()}
        
        ${positions.map(renderGame).join('')}
      </svg>
    `;
  }
}
