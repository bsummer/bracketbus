import { Injectable } from '@nestjs/common';
import { GamesService } from '../games/games.service';
import { TournamentsService } from './tournaments.service';
import sharp from 'sharp';
import * as https from 'https';
import * as http from 'http';

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

    // Collect all unique logo URLs and convert them to base64 data URLs
    const logoDataUrls = await this.convertLogosToDataUrls(sortedGames);

    // Generate SVG for the bracket with base64 embedded logos
    const svg = this.generateBracketSVG(tournament, sortedGames, logoDataUrls);

    // Convert SVG to PNG using sharp (much faster than Puppeteer)
    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();

    return pngBuffer;
  }

  /**
   * Fetches logo images and converts them to base64 data URLs
   * @param games - Array of games with team data
   * @returns Map of logo URL to base64 data URL
   */
  private async convertLogosToDataUrls(games: Game[]): Promise<Map<string, string>> {
    const logoUrls = new Set<string>();
    const logoDataUrls = new Map<string, string>();

    // Collect all unique logo URLs from teams
    games.forEach((game) => {
      if (game.team1 && 'logoUrl' in game.team1 && (game.team1 as any).logoUrl) {
        logoUrls.add((game.team1 as any).logoUrl);
      }
      if (game.team2 && 'logoUrl' in game.team2 && (game.team2 as any).logoUrl) {
        logoUrls.add((game.team2 as any).logoUrl);
      }
      if (game.winner && 'logoUrl' in game.winner && (game.winner as any).logoUrl) {
        logoUrls.add((game.winner as any).logoUrl);
      }
    });

    // Fetch and convert each logo URL to base64
    const fetchPromises = Array.from(logoUrls).map(async (url) => {
      try {
        const dataUrl = await this.fetchImageAsDataUrl(url);
        if (dataUrl) {
          logoDataUrls.set(url, dataUrl);
        }
      } catch (error) {
        console.warn(`Failed to fetch logo from ${url}:`, error);
        // Continue without this logo - it will just not appear
      }
    });

    await Promise.all(fetchPromises);

    return logoDataUrls;
  }

  /**
   * Fetches an image from a URL and converts it to a base64 data URL
   * @param url - Image URL
   * @returns Base64 data URL or null if fetch fails
   */
  private async fetchImageAsDataUrl(url: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      
      client.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to fetch image: ${response.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const contentType = response.headers['content-type'] || 'image/png';
          const base64 = buffer.toString('base64');
          const dataUrl = `data:${contentType};base64,${base64}`;
          resolve(dataUrl);
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
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
    const width = 2250; //2400;
    const height = 1600;
    const padding = 40;
    
    // Calculate region dimensions - regions take outer portions, center takes middle
    // Increased center width and moved right regions further right to give more space for Final Four
    const leftRegionWidth = 550;
    const centerWidth = 800; // Increased from 700 to give more space for Final Four games
    const rightRegionWidth = 550;
    const rightRegionOffset = 250; // Additional space to push right regions further right
    const regionHeight = (height - padding * 2) / 2;
    const gameBoxWidth = 180;

    // Region positions matching traditional bracket layout
    const regionLayout = {
      East: { startX: padding, startY: padding + 80, width: leftRegionWidth, height: regionHeight - 80 },
      West: { startX: padding, startY: padding + regionHeight + 80, width: leftRegionWidth, height: regionHeight - 80 },
      South: { startX: padding + leftRegionWidth + centerWidth + rightRegionOffset, startY: padding + 80, width: rightRegionWidth, height: regionHeight - 80 },
      Midwest: { startX: padding + leftRegionWidth + centerWidth + rightRegionOffset, startY: padding + regionHeight + 80, width: rightRegionWidth, height: regionHeight - 80 },
    };

    const regionOrder = ['East', 'West', 'South', 'Midwest'];
    const rightSideRegions = ['South', 'Midwest'];

    // Helper to calculate game Y position based on bracket structure (for Round 1 only)
    const calculateGameYRound1 = (gameIdx: number, totalGames: number): number => {
      const gamesInRound1 = 8;
      const baseSpacing = 70; // Base spacing between games in round 1
      
      // Calculate starting position to center games vertically
      const totalHeight = (gamesInRound1 - 1) * baseSpacing;
      const roundHeight = (totalGames - 1) * baseSpacing;
      const startY = (totalHeight - roundHeight) / 2;
      
      return startY + (gameIdx * baseSpacing);
    };

    // Position regional games (rounds 1-4)
    // Must process rounds in order so we can calculate Y based on parent positions
    regionOrder.forEach((region) => {
      const regionGames = gamesByRegionAndRound[region];
      if (!regionGames) return;

      const layout = regionLayout[region as keyof typeof regionLayout];
      const rounds = [1, 2, 3, 4];
      const isRightSide = rightSideRegions.includes(region);
      
      // Game box dimensions
      // const gameBoxWidth = 180;
      const gameBoxHalfWidth = gameBoxWidth / 2;
      
      // Calculate round positions with proper spacing to prevent overlap
      // We need space for game boxes (180px) plus padding between rounds (40px)
      const minSpacing = gameBoxWidth + 40;
      const availableWidth = layout.width - gameBoxWidth; // Leave space for first/last round boxes
      const roundSpacing = availableWidth / 3; // Space between round centers (3 gaps for 4 rounds)
      
      // Ensure minimum spacing between rounds
      const actualRoundSpacing = Math.max(roundSpacing, minSpacing);

      // Process rounds in order - Round 1 first, then Round 2+, so we can use parent positions
      rounds.forEach((round, roundIdx) => {
        const roundGames = regionGames[round]?.sort((a, b) => a.gameNumber - b.gameNumber) || [];
        
        roundGames.forEach((game, gameIdx) => {
          let x: number;
          if (isRightSide) {
            // Right side: round 1 on far right, progress left
            const roundsFromRight = roundIdx;
            x = layout.startX + layout.width - gameBoxHalfWidth - (roundsFromRight * actualRoundSpacing);
          } else {
            // Left side: round 1 on far left, progress right
            x = layout.startX + gameBoxHalfWidth + (roundIdx * actualRoundSpacing);
          }
          
          let y: number;
          if (round === 1) {
            // Round 1: Use standard calculation
            y = layout.startY + calculateGameYRound1(gameIdx, roundGames.length);
          } else {
            // Round 2+: Position vertically between parent games
            const parent1Id = game.parentGame1Id;
            const parent2Id = game.parentGame2Id;
            
            if (parent1Id && parent2Id) {
              // Find parent positions (they should already be calculated since we process rounds in order)
              const parent1Pos = positions.find(p => p.game.id === parent1Id && p.region === region);
              const parent2Pos = positions.find(p => p.game.id === parent2Id && p.region === region);
              
              if (parent1Pos && parent2Pos) {
                // Position at the midpoint between parent games
                y = (parent1Pos.y + parent2Pos.y) / 2;
              } else {
                // Fallback if parents not found (shouldn't happen, but safety check)
                const baseSpacing = 70;
                const spacing = baseSpacing / Math.pow(2, round - 1);
                const totalHeight = (8 - 1) * baseSpacing;
                const roundHeight = (roundGames.length - 1) * spacing;
                const startY = (totalHeight - roundHeight) / 2;
                y = layout.startY + startY + (gameIdx * spacing);
              }
            } else {
              // Fallback if no parents (shouldn't happen for Round 2+)
              const baseSpacing = 70;
              const spacing = baseSpacing / Math.pow(2, round - 1);
              const totalHeight = (8 - 1) * baseSpacing;
              const roundHeight = (roundGames.length - 1) * spacing;
              const startY = (totalHeight - roundHeight) / 2;
              y = layout.startY + startY + (gameIdx * spacing);
            }
          }
          
          positions.push({ game, x, y, round, region });
        });
      });
    });

    // Position center games (Final Four and Championship)
    const centerGames = gamesByRegionAndRound['center'];
    if (centerGames) {
      // const centerX = padding + leftRegionWidth + (centerWidth  / 2);
      const centerX = width / 2;
      const leftSideRegions = ['East', 'West'];
      
      // Final Four (Round 5) - position based on parent games
      const round5Games = centerGames[5]?.sort((a, b) => a.gameNumber - b.gameNumber) || [];
      
      // Separate Final Four games by which side their parents come from
      const leftFinalFourGames: Game[] = [];
      const rightFinalFourGames: Game[] = [];
      
      round5Games.forEach((game) => {
        if (!game.parentGame1Id || !game.parentGame2Id) {
          // Fallback: use first game for left, second for right
          if (round5Games.indexOf(game) === 0) {
            leftFinalFourGames.push(game);
          } else {
            rightFinalFourGames.push(game);
          }
          return;
        }
        
        // Find parent games to determine which side this Final Four game comes from
        const parent1 = games.find(g => g.id === game.parentGame1Id);
        const parent2 = games.find(g => g.id === game.parentGame2Id);
        
        // Check if parents are from left side (East, West) or right side (South, Midwest)
        const parent1FromLeft = parent1 && parent1.region && leftSideRegions.includes(parent1.region);
        const parent2FromLeft = parent2 && parent2.region && leftSideRegions.includes(parent2.region);
        
        // If both parents are from left side, this is the left Final Four game
        // Otherwise, it's the right Final Four game (parents from right side)
        if (parent1FromLeft && parent2FromLeft) {
          leftFinalFourGames.push(game);
        } else {
          rightFinalFourGames.push(game);
        }
      });
      
      // Position Final Four games aligned vertically with horizontal spacing
      // Final Four game boxes are 180px wide, so we need at least 180px + padding between centers
      // Using 220px spacing (110px on each side of center) to prevent overlap with some breathing room
      const finalFourHorizontalSpacing = 220;
      
      // Calculate the vertical center point for both Final Four games
      // Find the average Y position of all Round 4 games (parents of Final Four)
      let finalFourY: number;
      
      if (round5Games.length > 0) {
        const parentYs: number[] = [];
        
        round5Games.forEach((game) => {
          if (game.parentGame1Id && game.parentGame2Id) {
            const parent1Pos = positions.find(p => p.game.id === game.parentGame1Id);
            const parent2Pos = positions.find(p => p.game.id === game.parentGame2Id);
            
            if (parent1Pos && parent2Pos) {
              // Add the midpoint between each pair of parents
              parentYs.push((parent1Pos.y + parent2Pos.y) / 2);
            }
          }
        });
        
        if (parentYs.length > 0) {
          // Use the average Y of all parent midpoints
          finalFourY = parentYs.reduce((sum, y) => sum + y, 0) / parentYs.length;
        } else {
          // Fallback: center vertically
          finalFourY = height / 2;
        }
      } else {
        // Fallback: center vertically
        finalFourY = height / 2;
      }
      
      // Position both Final Four games at the same Y coordinate with horizontal spacing
      round5Games.forEach((game) => {
        const isLeftFinalFour = leftFinalFourGames.includes(game);
        const x = isLeftFinalFour 
          ? centerX - finalFourHorizontalSpacing / 2 
          : centerX + finalFourHorizontalSpacing / 2;
        
        positions.push({ game, x, y: finalFourY, round: 5, region: 'center' });
      });

      // Championship (Round 6) - position below and horizontally centered between Final Four games
      const round6Games = centerGames[6] || [];
      round6Games.forEach((game) => {
        // Championship is horizontally centered between the two Final Four games
        const x = centerX;
        let y: number;
        
        if (game.parentGame1Id && game.parentGame2Id) {
          // Find parent Final Four game positions
          const parent1Pos = positions.find(p => p.game.id === game.parentGame1Id);
          const parent2Pos = positions.find(p => p.game.id === game.parentGame2Id);
          
          if (parent1Pos && parent2Pos) {
            // Position below the Final Four games (lower Y value = further down)
            // Calculate vertical spacing: find the lower Y of the two Final Four games and add spacing
            const lowerY = Math.max(parent1Pos.y, parent2Pos.y);
            const championshipVerticalSpacing = 150; // Space between Final Four and Championship
            y = lowerY + championshipVerticalSpacing;
          } else {
            // Fallback: position below center
            y = height / 2 + 200;
          }
        } else {
          // Fallback: position below center
          y = height / 2 + 200;
        }
        
        positions.push({ game, x, y, round: 6, region: 'center' });
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

  private generateBracketSVG(tournament: Tournament, games: Game[], logoDataUrls?: Map<string, string>): string {
    const width = 2250; //2400;
    const height = 1600;
    const padding = 40;
    const leftRegionWidth = 550;
    const centerWidth = 800; // Increased from 700 to give more space for Final Four games
    const rightRegionWidth = 550;
    const rightRegionOffset = 250; // Additional space to push right regions further right
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

      // For Final Four games (Round 5), show region champion labels instead of TBD
      let team1Text: string;
      let team2Text: string;
      
      if (pos.round === 5) {
        // Final Four game - show region champion labels for TBD teams
        const regionMap: Record<string, string> = {
          'East': 'North',
          'West': 'West',
          'South': 'East',
          'Midwest': 'Midwest',
        };
        
        // Find parent games to determine regions
        let team1Region: string | null = null;
        let team2Region: string | null = null;
        
        if (pos.game.parentGame1Id) {
          const parent1 = games.find(g => g.id === pos.game.parentGame1Id);
          if (parent1?.region) {
            team1Region = parent1.region;
          }
        }
        
        if (pos.game.parentGame2Id) {
          const parent2 = games.find(g => g.id === pos.game.parentGame2Id);
          if (parent2?.region) {
            team2Region = parent2.region;
          }
        }
        
        // Use team name if selected, otherwise show region champion label
        team1Text = team1 
          ? this.escapeXml(team1.name) 
          : (team1Region ? `${regionMap[team1Region] || team1Region} Champion` : 'TBD');
        team2Text = team2 
          ? this.escapeXml(team2.name) 
          : (team2Region ? `${regionMap[team2Region] || team2Region} Champion` : 'TBD');
      } else {
        // Regular game - use team names or TBD
        team1Text = team1 ? this.escapeXml(team1.name) : 'TBD';
        team2Text = team2 ? this.escapeXml(team2.name) : 'TBD';
      }

      const team1Fill = isTeam1Winner ? '#e8f5e9' : 'white';
      const team2Fill = isTeam2Winner ? '#e8f5e9' : 'white';
      
      // Logo dimensions
      const logoSize = pos.round === 6 ? 16 : 12;
      const logoSpacing = logoSize + 5;
      const textStartX = 5 + logoSpacing; // Start text after logo space

      // Get logo URLs and convert to data URLs if available
      const logo1Url = team1 && 'logoUrl' in team1 ? (team1 as any).logoUrl : null;
      const logo2Url = team2 && 'logoUrl' in team2 ? (team2 as any).logoUrl : null;
      const logo1DataUrl = logo1Url && logoDataUrls ? logoDataUrls.get(logo1Url) : null;
      const logo2DataUrl = logo2Url && logoDataUrls ? logoDataUrls.get(logo2Url) : null;

      // Build content with logo positioning
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

      // Logo images (only show if logo data URL exists - base64 embedded)
      const logo1Image = logo1DataUrl 
        ? `<image href="${this.escapeXml(logo1DataUrl)}" x="5" y="${(gameBoxHeight / 2 - logoSize) / 2}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`
        : '';
      const logo2Image = logo2DataUrl 
        ? `<image href="${this.escapeXml(logo2DataUrl)}" x="5" y="${gameBoxHeight / 2 + (gameBoxHeight / 2 - logoSize) / 2}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`
        : '';

      return `
        <g transform="translate(${gameX},${gameY})">
          <rect x="0" y="0" width="${gameBoxWidth}" height="${gameBoxHeight}" 
                stroke="#333" stroke-width="${pos.round === 6 ? 3 : 2}" fill="white" rx="3"/>
          <rect x="0" y="0" width="${gameBoxWidth}" height="${gameBoxHeight / 2}" 
                fill="${team1Fill}"/>
          <rect x="0" y="${gameBoxHeight / 2}" width="${gameBoxWidth}" height="${gameBoxHeight / 2}" 
                fill="${team2Fill}"/>
          <line x1="0" y1="${gameBoxHeight / 2}" x2="${gameBoxWidth}" y2="${gameBoxHeight / 2}" stroke="#ddd" stroke-width="1"/>
          
          ${logo1Image}
          <text x="${textStartX}" y="${lineHeight}" font-size="${fontSize}" font-family="Arial" fill="#333" font-weight="${team1 && isTeam1Winner ? 'bold' : 'normal'}">
            ${team1Content}
          </text>
          
          ${logo2Image}
          <text x="${textStartX}" y="${gameBoxHeight / 2 + lineHeight}" font-size="${fontSize}" font-family="Arial" fill="#333" font-weight="${team2 && isTeam2Winner ? 'bold' : 'normal'}">
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
    const centerX = width / 2; //padding + leftRegionWidth + (centerWidth / 2);
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
      
      positions.forEach((pos) => {
        const game = pos.game;
        const isRightSide = rightSideRegions.includes(pos.region);
        const isCenter = pos.region === 'center';
        const gameBoxW = pos.round === 6 ? 250 : gameBoxWidth;
        const gameBoxH = pos.round === 6 ? 80 : gameBoxHeight;
        
        // Only draw lines from parent games to their direct children
        // Round 4 games connect to Round 5 (Final Four)
        // Round 5 games (Final Four) connect to Round 6 (Championship)
        // Do not draw lines from Round 4 to Round 6
        
        // Connect to child game (next round)
        // Only draw lines from Round 5 (Final Four) to Round 6 (Championship)
        // Skip lines from Round 4 to Round 5 (Final Four) - using region champion labels instead
        if (game.parentGame1Id || game.parentGame2Id) {
          // Skip Round 4 → Round 5 connections
          if (pos.round === 5) {
            return; // Don't draw lines from Round 4 to Final Four
          }
          
          // Verify parent-child relationship: parent must be exactly one round earlier
          const parent1Round = game.parentGame1Id ? positions.find(p => p.game.id === game.parentGame1Id)?.round : null;
          const parent2Round = game.parentGame2Id ? positions.find(p => p.game.id === game.parentGame2Id)?.round : null;
          
          // Check if parents are from the correct round (should be current round - 1)
          const expectedParentRound = pos.round - 1;
          const parent1Valid = !parent1Round || parent1Round === expectedParentRound;
          const parent2Valid = !parent2Round || parent2Round === expectedParentRound;
          
          // Skip if parents are not from the correct round
          if (!parent1Valid || !parent2Valid) {
            return; // Skip this connection - parents are not from the correct round
          }
          // This game is a child, find parent positions
          if (game.parentGame1Id) {
            const parent1Pos = positions.find(p => p.game.id === game.parentGame1Id);
            if (parent1Pos) {
              const parentBoxW = parent1Pos.round === 6 ? 250 : gameBoxWidth;
              const parentIsRight = rightSideRegions.includes(parent1Pos.region);
              const parentIsCenter = parent1Pos.region === 'center';
              
              // Calculate start point (parent game bottom)
              let parentStartX: number;
              const parentStartY = parent1Pos.y; // + parentBoxH / 2;
              
              if (parentIsRight) {
                parentStartX = parent1Pos.x - parentBoxW / 2; // Left edge for right regions
              } else if (parentIsCenter) {
                parentStartX = parent1Pos.x; // Center for center games
              } else {
                parentStartX = parent1Pos.x + parentBoxW / 2; // Right edge for left regions
              }
              
              // Calculate end point (child game top)
              let childEndX: number;
              const childEndY = pos.y - gameBoxH / 2;
              
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
                lines.push(`<path d="M ${parentStartX} ${parentStartY} L ${parentStartX} ${midY} L ${childEndX} ${midY} L ${childEndX} ${childEndY}" stroke="#D3D3D3" stroke-width="2" fill="none"/>`);
              } else if (isRightSide || parentIsRight) {
                // Right side: horizontal line going left
                const midX = Math.min(parentStartX, childEndX) - 60;
                lines.push(`<path d="M ${parentStartX} ${parentStartY} L ${midX} ${parentStartY} L ${midX} ${childEndY} L ${childEndX} ${childEndY}" stroke="#D3D3D3" stroke-width="2" fill="none"/>`);
              } else {
                // Left side: horizontal line going right
                const midX = Math.max(parentStartX, childEndX) + 60;
                lines.push(`<path d="M ${parentStartX} ${parentStartY} L ${midX} ${parentStartY} L ${midX} ${childEndY} L ${childEndX} ${childEndY}" stroke="#D3D3D3" stroke-width="2" fill="none"/>`);
              }
            }
          }
          
          if (game.parentGame2Id) {
            const parent2Pos = positions.find(p => p.game.id === game.parentGame2Id);
            if (parent2Pos) {
              const parentBoxW = parent2Pos.round === 6 ? 250 : gameBoxWidth;
              const parentIsRight = rightSideRegions.includes(parent2Pos.region);
              const parentIsCenter = parent2Pos.region === 'center';
              
              // Calculate start point (parent game bottom)
              let parentStartX: number;
              const parentStartY = parent2Pos.y; // + parentBoxH / 2;
              
              if (parentIsRight) {
                parentStartX = parent2Pos.x - parentBoxW / 2; // Left edge for right regions
              } else if (parentIsCenter) {
                parentStartX = parent2Pos.x; // Center for center games
              } else {
                parentStartX = parent2Pos.x + parentBoxW / 2; // Right edge for left regions
              }
              
              // Calculate end point (child game top)
              let childEndX: number;
              const childEndY = pos.y - gameBoxH / 2;
              
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
                lines.push(`<path d="M ${parentStartX} ${parentStartY} L ${parentStartX} ${midY} L ${childEndX} ${midY} L ${childEndX} ${childEndY}" stroke="#D3D3D3" stroke-width="2" fill="none"/>`);
              } else if (isRightSide || parentIsRight) {
                // Right side: horizontal line going left
                const midX = Math.min(parentStartX, childEndX) - 60;
                lines.push(`<path d="M ${parentStartX} ${parentStartY} L ${midX} ${parentStartY} L ${midX} ${childEndY} L ${childEndX} ${childEndY}" stroke="#D3D3D3" stroke-width="2" fill="none"/>`);
              } else {
                // Left side: horizontal line going right
                const midX = Math.max(parentStartX, childEndX) + 60;
                lines.push(`<path d="M ${parentStartX} ${parentStartY} L ${midX} ${parentStartY} L ${midX} ${childEndY} L ${childEndX} ${childEndY}" stroke="#D3D3D3" stroke-width="2" fill="none"/>`);
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
      South: { x: padding + leftRegionWidth + centerWidth + rightRegionOffset + rightRegionWidth / 2, y: padding + 60 },
      Midwest: { x: padding + leftRegionWidth + centerWidth + rightRegionOffset + rightRegionWidth / 2, y: padding + regionHeight + 60 },
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
