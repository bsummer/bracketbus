import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { Game } from '../api/games';
import type { Tournament } from '../api/tournaments';
import type { Team } from '../api/teams';

interface TournamentBracketPDFProps {
  tournament: Tournament;
  games: Game[];
}

// Helper to get teams for a game
const getTeamsForGame = (game: Game, allGames: Game[]): { team1: Team | null; team2: Team | null } => {
  if (!game) {
    return { team1: null, team2: null };
  }

  // Round 1 games have teams populated directly
  if (game.round === 1) {
    return {
      team1: game.team1 ?? null,
      team2: game.team2 ?? null,
    };
  }

  // For Round 2+, get teams from parent game winners
  let team1: Team | null = null;
  let team2: Team | null = null;

  if (game.parentGame1) {
    team1 = game.parentGame1.winner ?? null;
  } else if (game.parentGame1Id) {
    const parentGame1 = allGames.find((g) => g.id === game.parentGame1Id);
    if (parentGame1?.winner) {
      team1 = parentGame1.winner;
    }
  }

  if (game.parentGame2) {
    team2 = game.parentGame2.winner ?? null;
  } else if (game.parentGame2Id) {
    const parentGame2 = allGames.find((g) => g.id === game.parentGame2Id);
    if (parentGame2?.winner) {
      team2 = parentGame2.winner;
    }
  }

  return { team1, team2 };
};

// Helper to get region for a game
const getGameRegion = (game: Game): string => {
  if (game.round <= 4 && game.region) {
    return game.region;
  }
  return 'center';
};

// Calculate game positions for bracket layout
interface GamePosition {
  game: Game;
  x: number;
  y: number;
  region: string;
  round: number;
}

const calculateGamePositions = (games: Game[]): GamePosition[] => {
  const positions: GamePosition[] = [];
  
  // Group games by region and round
  const gamesByRegionAndRound: Record<string, Record<number, Game[]>> = {};
  games.forEach((game) => {
    const region = getGameRegion(game);
    const round = game.round || 0;
    if (!gamesByRegionAndRound[region]) {
      gamesByRegionAndRound[region] = {};
    }
    if (!gamesByRegionAndRound[region][round]) {
      gamesByRegionAndRound[region][round] = [];
    }
    gamesByRegionAndRound[region][round].push(game);
  });

  // Page dimensions in points (A4 landscape: 842 x 595)
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 50;
  const headerHeight = 50;
  const usableWidth = pageWidth - (margin * 2);
  const usableHeight = pageHeight - headerHeight - (margin * 2);
  const startY = headerHeight + margin;

  // Region positions (East, West on top; South, Midwest on bottom)
  const regionLayout = {
    East: { startX: margin, startY, width: usableWidth / 2, height: usableHeight / 2 },
    West: { startX: margin + usableWidth / 2, startY, width: usableWidth / 2, height: usableHeight / 2 },
    South: { startX: margin, startY: startY + usableHeight / 2, width: usableWidth / 2, height: usableHeight / 2 },
    Midwest: { startX: margin + usableWidth / 2, startY: startY + usableHeight / 2, width: usableWidth / 2, height: usableHeight / 2 },
    center: { startX: margin + usableWidth * 0.25, startY: startY + usableHeight * 0.25, width: usableWidth * 0.5, height: usableHeight * 0.5 },
  };

  const regions = ['East', 'West', 'South', 'Midwest', 'center'];

  regions.forEach((region) => {
    const regionGames = gamesByRegionAndRound[region];
    if (!regionGames) return;

    const layout = regionLayout[region as keyof typeof regionLayout];
    const rounds = Object.keys(regionGames)
      .map(Number)
      .sort((a, b) => a - b);

    if (region === 'center') {
      // Center region: rounds 5 and 6 in the middle, vertically stacked
      rounds.forEach((round, roundIdx) => {
        const roundGames = regionGames[round].sort((a, b) => a.gameNumber - b.gameNumber);
        const roundSpacing = layout.height / (rounds.length + 1);
        
        roundGames.forEach((game, gameIdx) => {
          const x = layout.startX + (layout.width / 2);
          const y = layout.startY + ((roundIdx + 1) * roundSpacing);
          positions.push({ game, x, y, region, round });
        });
      });
    } else {
      // Regional brackets: 4 rounds going from left to right
      // Each round has half the games of the previous round
      const roundCount = 4; // Rounds 1-4 for each region
      const gameBoxWidth = 100;
      const roundSpacing = layout.width / roundCount;
      
      rounds.forEach((round, roundIdx) => {
        const roundGames = regionGames[round].sort((a, b) => a.gameNumber - b.gameNumber);
        const gamesInRound = roundGames.length;
        // Calculate vertical spacing - games should be evenly distributed but get closer together as rounds progress
        const totalGameHeight = gamesInRound * 45; // 45 points per game (including spacing)
        const startGameY = layout.startY + (layout.height - totalGameHeight) / 2;
        
        roundGames.forEach((game, gameIdx) => {
          const x = layout.startX + (roundIdx * roundSpacing) + (roundSpacing / 2);
          const y = startGameY + (gameIdx * 45) + 22.5; // 22.5 is half of 45 (game height)
          positions.push({ game, x, y, region, round });
        });
      });
    }
  });

  return positions;
};

// PDF Styles
const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    padding: 0,
  },
  header: {
    position: 'absolute',
    top: 10,
    left: 40,
    right: 40,
    height: 40,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tournamentInfo: {
    fontSize: 10,
    color: '#666',
  },
  gameBox: {
    position: 'absolute',
    width: 100,
    minHeight: 40,
    border: '1px solid #333',
    backgroundColor: '#FFFFFF',
    padding: 3,
    fontSize: 6,
  },
  teamRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
    padding: 1,
    height: 15,
  },
  teamRowWinner: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
    padding: 1,
    height: 15,
    backgroundColor: '#E8F5E9',
  },
  seed: {
    width: 10,
    fontSize: 5,
    fontWeight: 'bold',
    marginRight: 2,
    textAlign: 'center',
  },
  logo: {
    width: 8,
    height: 8,
    marginRight: 2,
  },
  teamName: {
    flex: 1,
    fontSize: 5,
    marginRight: 2,
    overflow: 'hidden',
  },
  score: {
    fontSize: 5,
    fontWeight: 'bold',
    width: 10,
    textAlign: 'right',
  },
  tbd: {
    fontSize: 5,
    fontStyle: 'italic',
    color: '#999',
    paddingLeft: 2,
  },
  horizontalLine: {
    position: 'absolute',
    borderTop: '0.5px solid #333',
  },
  verticalLine: {
    position: 'absolute',
    borderLeft: '0.5px solid #333',
  },
  regionLabel: {
    position: 'absolute',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#F0F0F0',
    padding: 2,
  },
});

// Render connecting lines between parent and child games
const renderConnectingLines = (parentPos: GamePosition, childPos: GamePosition): React.ReactElement[] => {
  // Only draw lines for consecutive rounds
  if (childPos.round !== parentPos.round + 1) return [];

  const gameBoxWidth = 100;
  const gameBoxHeight = 40;
  const parentRightX = parentPos.x + gameBoxWidth / 2;
  const childLeftX = childPos.x - gameBoxWidth / 2;
  const parentBottomY = parentPos.y + gameBoxHeight / 2;
  const childTopY = childPos.y - gameBoxHeight / 2;

  const lines: React.ReactElement[] = [];

  // Calculate midpoint Y for horizontal segment
  const midY = (parentBottomY + childTopY) / 2;

  // Vertical line from parent bottom to midpoint
  const verticalLine1Height = Math.abs(midY - parentBottomY);
  if (verticalLine1Height > 0) {
    lines.push(
      <View
        key={`v1-${parentPos.game.id}-${childPos.game.id}`}
        style={[
          styles.verticalLine,
          {
            left: parentRightX - 0.25,
            top: parentBottomY,
            width: 0.5,
            height: verticalLine1Height,
          },
        ]}
      />
    );
  }

  // Horizontal line from parent right to child left
  const horizontalLineWidth = Math.abs(childLeftX - parentRightX);
  if (horizontalLineWidth > 0) {
    lines.push(
      <View
        key={`h-${parentPos.game.id}-${childPos.game.id}`}
        style={[
          styles.horizontalLine,
          {
            left: Math.min(parentRightX, childLeftX),
            top: midY - 0.25,
            width: horizontalLineWidth,
            height: 0.5,
          },
        ]}
      />
    );
  }

  // Vertical line from midpoint to child top
  const verticalLine2Height = Math.abs(childTopY - midY);
  if (verticalLine2Height > 0) {
    lines.push(
      <View
        key={`v2-${parentPos.game.id}-${childPos.game.id}`}
        style={[
          styles.verticalLine,
          {
            left: childLeftX - 0.25,
            top: midY,
            width: 0.5,
            height: verticalLine2Height,
          },
        ]}
      />
    );
  }

  return lines;
};

const TournamentBracketPDF: React.FC<TournamentBracketPDFProps> = ({ tournament, games }) => {
  // Memoize game positions calculation
  // Add error handling for position calculation
  const gamePositions = React.useMemo(() => {
    try {
      console.log('Calculating game positions...', { gamesCount: games.length });
      const positions = calculateGamePositions(games);
      console.log('Game positions calculated:', { positionsCount: positions.length });
      return positions;
    } catch (error) {
      console.error('Error calculating game positions:', error);
      return [];
    }
  }, [games]);

  const renderTeam = (team: Team | null, isWinner: boolean, score: number | null | undefined): React.ReactElement => {
    const teamRowStyle = isWinner ? styles.teamRowWinner : styles.teamRow;

    if (!team) {
      return (
        <View style={teamRowStyle}>
          <Text style={styles.tbd}>TBD</Text>
        </View>
      );
    }

    const seed = 'seed' in team ? (team as any).seed : null;
    const displayScore = team && score !== null && score !== undefined ? score : (team ? 0 : null);

    // Try to render logo, but don't fail if it doesn't load
    // Images can cause timeouts if they fail to load, so we'll skip them for now
    // or handle them more gracefully
    const shouldRenderLogo = false; // Disable logos temporarily to avoid timeout issues
    
    return (
      <View style={teamRowStyle}>
        {seed && <Text style={styles.seed}>{seed}</Text>}
        {shouldRenderLogo && team.logoUrl && (
          <Image
            src={team.logoUrl}
            style={styles.logo}
            cache={false}
          />
        )}
        <Text style={styles.teamName}>{team.name}</Text>
        {displayScore !== null && (
          <Text style={styles.score}>{displayScore}</Text>
        )}
      </View>
    );
  };

  const renderGame = (pos: GamePosition): React.ReactElement => {
    const { team1, team2 } = getTeamsForGame(pos.game, games);
    const isTeam1Winner = pos.game.winnerId === team1?.id;
    const isTeam2Winner = pos.game.winnerId === team2?.id;

    return (
      <View
        key={pos.game.id}
        style={[
          styles.gameBox,
          {
            left: pos.x - 50, // Center the box on the x position (50 = width/2)
            top: pos.y - 20, // Center the box on the y position (20 = height/2)
          },
        ]}
      >
        {renderTeam(team1, isTeam1Winner, pos.game.scoreTeam1)}
        {renderTeam(team2, isTeam2Winner, pos.game.scoreTeam2)}
      </View>
    );
  };

  // Calculate connecting lines - simplified to reduce rendering complexity
  // For now, skip connecting lines to improve performance
  const connectingLines: React.ReactElement[] = [];
  // Temporarily disabled to reduce PDF generation time
  // gamePositions.forEach((parentPos) => {
  //   const childGames = gamePositions.filter(
  //     (childPos) =>
  //       (childPos.game.parentGame1Id === parentPos.game.id || childPos.game.parentGame2Id === parentPos.game.id) &&
  //       childPos.round === parentPos.round + 1
  //   );

  //   childGames.forEach((childPos) => {
  //     const lines = renderConnectingLines(parentPos, childPos);
  //     connectingLines.push(...lines);
  //   });
  // });

  // Limit the number of games rendered for testing
  const gamesToRender = gamePositions.slice(0, 100); // Limit to first 100 games
  
  console.log('Rendering PDF with:', { 
    totalGames: gamePositions.length, 
    renderingGames: gamesToRender.length,
    connectingLinesCount: connectingLines.length 
  });

  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="landscape">
        <View style={styles.header}>
          <Text style={styles.title}>{tournament.name}</Text>
          <Text style={styles.tournamentInfo}>
            Start Date: {new Date(tournament.startDate).toLocaleDateString()}
          </Text>
        </View>

        {/* Render region labels */}
        {['East', 'West', 'South', 'Midwest'].map((region) => {
          const regionGames = gamePositions.filter((pos) => pos.region === region);
          if (regionGames.length === 0) return null;

          const regionLayout = {
            East: { startX: 50, startY: 100 },
            West: { startX: 471, startY: 100 },
            South: { startX: 50, startY: 367.5 },
            Midwest: { startX: 471, startY: 367.5 },
          };
          const layout = regionLayout[region as keyof typeof regionLayout];
          
          return (
            <View
              key={`label-${region}`}
              style={[
                styles.regionLabel,
                {
                  left: layout.startX,
                  top: layout.startY,
                  width: 160,
                },
              ]}
            >
              <Text>{region} Region</Text>
            </View>
          );
        })}

        {/* Center region label */}
        {(() => {
          const centerGames = gamePositions.filter((pos) => pos.region === 'center');
          if (centerGames.length === 0) return null;

          return (
            <View
              key="label-center"
              style={[
                styles.regionLabel,
                {
                  left: 341,
                  top: 233.75,
                  width: 160,
                },
              ]}
            >
              <Text>Final Four & Championship</Text>
            </View>
          );
        })()}

        {/* Render connecting lines - temporarily disabled */}
        {/* {connectingLines} */}

        {/* Render all games - limited for testing */}
        {gamesToRender.map(renderGame)}
      </Page>
    </Document>
  );
};

export default TournamentBracketPDF;