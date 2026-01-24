# Import Games from CSV

This guide explains how to import games into the `games` table using a CSV file. This script can create games from Round 1 through the Championship (Round 6).

## CSV File Format

The CSV file format differs based on the round:

### Round 1 Games (Required Columns)

- **`game_number`** - Unique game number for this tournament (e.g., 1, 2, 3...)
- **`round`** - Round number (must be `1` for Round 1 games)
- **`region`** - Region name (must be one of: `East`, `West`, `South`, `Midwest`)
- **`team1_seed`** - Seed number for team 1 (1-16)
- **`team2_seed`** - Seed number for team 2 (1-16)
- **`tournament_name`** - The exact name of the tournament as it appears in the database

### Round 2-6 Games (Required Columns)

- **`game_number`** - Unique game number for this tournament
- **`round`** - Round number (2, 3, 4, 5, or 6)
- **`parent_game1_number`** - Game number of the first parent game
- **`parent_game2_number`** - Game number of the second parent game
- **`tournament_name`** - The exact name of the tournament as it appears in the database
- **`region`** - (Optional for Round 2-4) Region name. Leave empty for Round 5-6 (Final Four and Championship)

## CSV Examples

### Round 1 Example

```csv
game_number,round,region,team1_seed,team2_seed,tournament_name
1,1,East,1,16,2025 NCAA Tournament
2,1,East,2,15,2025 NCAA Tournament
3,1,East,3,14,2025 NCAA Tournament
4,1,East,4,13,2025 NCAA Tournament
5,1,East,5,12,2025 NCAA Tournament
6,1,East,6,11,2025 NCAA Tournament
7,1,East,7,10,2025 NCAA Tournament
8,1,East,8,9,2025 NCAA Tournament
9,1,West,1,16,2025 NCAA Tournament
10,1,West,2,15,2025 NCAA Tournament
... (continue for all 32 Round 1 games)
```

### Round 2 Example

```csv
game_number,round,region,parent_game1_number,parent_game2_number,tournament_name
33,2,East,1,2,2025 NCAA Tournament
34,2,East,3,4,2025 NCAA Tournament
35,2,East,5,6,2025 NCAA Tournament
36,2,East,7,8,2025 NCAA Tournament
37,2,West,9,10,2025 NCAA Tournament
... (continue for all Round 2 games)
```

### Round 3 Example

```csv
game_number,round,region,parent_game1_number,parent_game2_number,tournament_name
49,3,East,33,34,2025 NCAA Tournament
50,3,East,35,36,2025 NCAA Tournament
51,3,West,37,38,2025 NCAA Tournament
... (continue for all Round 3 games)
```

### Round 4 Example

```csv
game_number,round,region,parent_game1_number,parent_game2_number,tournament_name
57,4,East,49,50,2025 NCAA Tournament
58,4,West,51,52,2025 NCAA Tournament
59,4,South,53,54,2025 NCAA Tournament
60,4,Midwest,55,56,2025 NCAA Tournament
```

### Round 5 (Final Four) Example

```csv
game_number,round,parent_game1_number,parent_game2_number,tournament_name
61,5,57,58,2025 NCAA Tournament
62,5,59,60,2025 NCAA Tournament
```

Note: Round 5 games do not have a `region` column (or it should be empty).

### Round 6 (Championship) Example

```csv
game_number,round,parent_game1_number,parent_game2_number,tournament_name
63,6,61,62,2025 NCAA Tournament
```

Note: Round 6 games do not have a `region` column (or it should be empty).

## Complete CSV Example

Here's a complete example with all rounds:

```csv
game_number,round,region,team1_seed,team2_seed,parent_game1_number,parent_game2_number,tournament_name
1,1,East,1,16,,,2025 NCAA Tournament
2,1,East,2,15,,,2025 NCAA Tournament
3,1,East,3,14,,,2025 NCAA Tournament
4,1,East,4,13,,,2025 NCAA Tournament
5,1,East,5,12,,,2025 NCAA Tournament
6,1,East,6,11,,,2025 NCAA Tournament
7,1,East,7,10,,,2025 NCAA Tournament
8,1,East,8,9,,,2025 NCAA Tournament
9,1,West,1,16,,,2025 NCAA Tournament
10,1,West,2,15,,,2025 NCAA Tournament
... (all 32 Round 1 games)
33,2,East,1,2,2025 NCAA Tournament
34,2,East,3,4,2025 NCAA Tournament
... (all Round 2 games)
49,3,East,33,34,2025 NCAA Tournament
... (all Round 3 games)
57,4,East,49,50,2025 NCAA Tournament
... (all Round 4 games)
61,5,,61,62,2025 NCAA Tournament
62,5,,59,60,2025 NCAA Tournament
63,6,,61,62,2025 NCAA Tournament
```

## Important Notes

1. **Tournament must exist**: The tournament specified in `tournament_name` must already exist in the database.

2. **TournamentTeams must exist**: For Round 1 games, the teams must already exist in the `tournament_teams` table with the correct region and seed. Use the `import-teams.ts` script first if needed.

3. **Game ordering**: Games must be listed in order by round (Round 1 first, then Round 2, etc.). Within each round, games should be sorted by game number. Parent games must appear before child games.

4. **Parent game references**: For Round 2+, the parent game numbers must reference games that have already been created (either earlier in the CSV or already in the database).

5. **Game numbers**: Game numbers must be unique within a tournament. They don't need to be sequential, but they should be consistent.

6. **Region handling**:
   - Round 1: Region is required
   - Round 2-4: Region is optional but recommended
   - Round 5-6: Region should be empty (Final Four and Championship are not region-specific)

7. **Round validation**: Round numbers must be between 1 and 6.

8. **Existing games**: If a game with the same tournament ID and game number already exists, it will be skipped.

## Running the Import Script

### Prerequisites

1. Ensure the database is set up and accessible
2. Ensure the tournament exists in the database
3. Ensure teams are imported (use `import-teams.ts` first)
4. Have your CSV file ready with games ordered by round

### Steps

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Run the import script**:
   ```bash
   ts-node -r tsconfig-paths/register src/database/seeds/import-games.ts path/to/your/games.csv
   ```

   Replace `path/to/your/games.csv` with the actual path to your CSV file.

### Example

```bash
cd backend
ts-node -r tsconfig-paths/register src/database/seeds/import-games.ts ../data/games-2025.csv
```

## What the Script Does

1. **Reads the CSV file** and parses it
2. **Groups games by tournament** for efficient processing
3. **Sorts games** by round and game number to ensure proper ordering
4. **For each tournament**:
   - Verifies the tournament exists in the database
   - If not found, skips all games for that tournament
5. **For each game**:
   - **Round 1**: Finds teams by region and seed, creates game with teams
   - **Round 2+**: Finds parent games by game number, creates game with parent references
   - Validates round numbers (1-6)
   - Skips if game already exists
   - Sets region appropriately (required for Round 1, optional for 2-4, null for 5-6)

## Output

The script provides console output showing:
- Number of games found in CSV
- Tournament being processed
- Games created
- Any errors or skipped games

### Example Output

```
Found 63 games in CSV

Processing tournament: 2025 NCAA Tournament
  Created game 1 (Round 1, East)
  Created game 2 (Round 1, East)
  Created game 33 (Round 2, East)
  Created game 49 (Round 3, East)
  Created game 57 (Round 4, East)
  Created game 61 (Round 5)
  Created game 63 (Round 6)
  Game 1 (Round 1) already exists. Skipping.
  Invalid round "7" for game 64. Skipping.

Import completed!
Script completed successfully
```

## Troubleshooting

### Error: "Tournament not found"

- Verify the tournament name in your CSV exactly matches the tournament name in the database
- Check for extra spaces or different capitalization
- Create the tournament first if it doesn't exist

### Error: "Team not found" (Round 1)

- Ensure teams are imported using `import-teams.ts` first
- Verify the region and seed match exactly
- Check that the team exists in the `tournament_teams` table

### Error: "Parent game not found"

- Ensure parent games are listed before child games in the CSV
- Verify parent game numbers are correct
- Check that parent games exist in the database
- Make sure Round 1 games are created before Round 2+ games

### Error: "Invalid round"

- Ensure round numbers are between 1 and 6
- Check for non-numeric values in the round column

### Error: "Game already exists"

- The script will skip games that already exist
- If you want to update games, delete them first or modify the script

### Games not appearing

- Check the console output for skipped games
- Verify the tournament name is correct
- Ensure teams exist for Round 1 games
- Verify parent game numbers are correct for Round 2+ games

## CSV Template Structure

### Round 1 (32 games total - 8 per region)

```csv
game_number,round,region,team1_seed,team2_seed,tournament_name
1,1,East,1,16,Tournament Name
2,1,East,2,15,Tournament Name
... (8 games for East)
9,1,West,1,16,Tournament Name
... (8 games for West)
17,1,South,1,16,Tournament Name
... (8 games for South)
25,1,Midwest,1,16,Tournament Name
... (8 games for Midwest)
```

### Round 2 (16 games total - 4 per region)

```csv
game_number,round,region,parent_game1_number,parent_game2_number,tournament_name
33,2,East,1,2,Tournament Name
34,2,East,3,4,Tournament Name
... (4 games per region)
```

### Round 3 (8 games total - 2 per region)

```csv
game_number,round,region,parent_game1_number,parent_game2_number,tournament_name
49,3,East,33,34,Tournament Name
50,3,East,35,36,Tournament Name
... (2 games per region)
```

### Round 4 (4 games total - 1 per region)

```csv
game_number,round,region,parent_game1_number,parent_game2_number,tournament_name
57,4,East,49,50,Tournament Name
58,4,West,51,52,Tournament Name
59,4,South,53,54,Tournament Name
60,4,Midwest,55,56,Tournament Name
```

### Round 5 (2 games - Final Four)

```csv
game_number,round,parent_game1_number,parent_game2_number,tournament_name
61,5,57,58,Tournament Name
62,5,59,60,Tournament Name
```

### Round 6 (1 game - Championship)

```csv
game_number,round,parent_game1_number,parent_game2_number,tournament_name
63,6,61,62,Tournament Name
```

## Best Practices

1. **Import teams first**: Always run `import-teams.ts` before importing games
2. **Order matters**: List games in order by round (1, 2, 3, 4, 5, 6)
3. **Parent games first**: Ensure parent games are created before child games
4. **Use consistent game numbers**: Follow a numbering scheme (e.g., 1-32 for Round 1, 33-48 for Round 2, etc.)
5. **Test with a small subset**: Test with just Round 1 games first
6. **Backup your database**: Before running large imports
7. **Check console output**: Review any warnings or errors

## Game Numbering Convention

A common convention is:
- **Round 1**: Games 1-32 (8 per region)
- **Round 2**: Games 33-48 (4 per region)
- **Round 3**: Games 49-56 (2 per region)
- **Round 4**: Games 57-60 (1 per region)
- **Round 5**: Games 61-62 (Final Four)
- **Round 6**: Game 63 (Championship)

This is just a convention - you can use any numbering scheme as long as numbers are unique within the tournament.
