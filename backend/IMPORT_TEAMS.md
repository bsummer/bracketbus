# Import Teams from CSV

This guide explains how to import teams into the `tournament_teams` table using a CSV file.

## CSV File Format

The CSV file must contain the following columns (in order):

### Required Columns

- **`team_name`** - The name of the team (e.g., "Duke Blue Devils")
- **`region`** - The region name (must be one of: `East`, `West`, `South`, `Midwest`)
- **`seed`** - The seed number (must be between 1 and 16)
- **`tournament_name`** - The exact name of the tournament as it appears in the database

### Optional Columns

- **`logo_url`** - URL for the team's logo image (can be empty)

## CSV Example

Here's an example CSV file:

```csv
team_name,region,seed,logo_url,tournament_name
Duke Blue Devils,East,1,https://example.com/logos/duke.png,2025 NCAA Tournament
Alabama Crimson Tide,East,2,https://example.com/logos/alabama.png,2025 NCAA Tournament
Wisconsin Badgers,East,3,,2025 NCAA Tournament
Arizona Wildcats,East,4,https://example.com/logos/arizona.png,2025 NCAA Tournament
Oregon Ducks,East,5,,2025 NCAA Tournament
BYU Cougars,East,6,https://example.com/logos/byu.png,2025 NCAA Tournament
Saint Mary's Gaels,East,7,,2025 NCAA Tournament
Mississippi State Bulldogs,East,8,https://example.com/logos/mississippi-state.png,2025 NCAA Tournament
Baylor Bears,East,9,,2025 NCAA Tournament
Vanderbilt Commodores,East,10,https://example.com/logos/vanderbilt.png,2025 NCAA Tournament
VCU Rams,East,11,,2025 NCAA Tournament
Liberty Flames,East,12,https://example.com/logos/liberty.png,2025 NCAA Tournament
Akron Zips,East,13,,2025 NCAA Tournament
Montana Grizzlies,East,14,https://example.com/logos/montana.png,2025 NCAA Tournament
Robert Morris Colonials,East,15,,2025 NCAA Tournament
American Eagles,East,16,https://example.com/logos/american.png,2025 NCAA Tournament
```

## Important Notes

1. **Tournament must exist**: The tournament specified in `tournament_name` must already exist in the database. If it doesn't, those teams will be skipped.

2. **Seed validation**: Seeds must be between 1 and 16. Teams with invalid seeds will be skipped.

3. **Team creation**: If a team doesn't exist, it will be created automatically. If it exists, only the logo URL will be updated if a new one is provided.

4. **TournamentTeam relationships**: The script will create or update `TournamentTeam` relationships. If a relationship already exists, it will be updated if the seed or region has changed.

5. **Multiple tournaments**: You can include teams from multiple tournaments in a single CSV file. The script will group them by tournament and process each tournament separately.

6. **Region names**: Region names must match exactly: `East`, `West`, `South`, or `Midwest` (case-sensitive).

## Running the Import Script

### Prerequisites

1. Ensure the database is set up and accessible
2. Ensure the tournament exists in the database
3. Have your CSV file ready

### Steps

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Run the import script**:
   ```bash
   ts-node -r tsconfig-paths/register src/database/seeds/import-teams.ts path/to/your/teams.csv
   ```

   Replace `path/to/your/teams.csv` with the actual path to your CSV file.

### Example

```bash
cd backend
ts-node -r tsconfig-paths/register src/database/seeds/import-teams.ts ../data/teams-2025.csv
```

## What the Script Does

1. **Reads the CSV file** and parses it
2. **Groups teams by tournament** for efficient processing
3. **For each tournament**:
   - Verifies the tournament exists in the database
   - If not found, skips all teams for that tournament
4. **For each team**:
   - Creates the `Team` record if it doesn't exist
   - Updates the team's logo URL if provided and different
   - Validates the seed number (1-16)
   - Creates or updates the `TournamentTeam` relationship with seed and region

## Output

The script provides console output showing:
- Number of teams found in CSV
- Tournament being processed
- Teams created or updated
- TournamentTeam relationships created or updated
- Any errors or skipped teams

### Example Output

```
Found 64 teams in CSV

Processing tournament: 2025 NCAA Tournament
  Created team: Duke Blue Devils
  Created tournament-team: Duke Blue Devils (East #1)
  Created team: Alabama Crimson Tide
  Created tournament-team: Alabama Crimson Tide (East #2)
  Updated logo for team: Wisconsin Badgers
  Tournament-team already exists: Arizona Wildcats (East #4)
  Invalid seed "0" for team Invalid Team. Skipping.

Import completed!
Script completed successfully
```

## Troubleshooting

### Error: "Tournament not found"

- Verify the tournament name in your CSV exactly matches the tournament name in the database
- Check for extra spaces or different capitalization
- Create the tournament first if it doesn't exist

### Error: "Invalid seed"

- Ensure seed values are between 1 and 16
- Check for non-numeric values in the seed column
- Verify there are no extra spaces in the seed column

### Error: "CSV file not found"

- Verify the file path is correct
- Use absolute paths if relative paths don't work
- Ensure the file has read permissions

### Teams not appearing

- Check the console output for skipped teams
- Verify the tournament name is correct
- Ensure seed values are valid (1-16)
- Check for any error messages in the console

## Complete CSV Template

Here's a complete template with all 64 teams (16 per region):

```csv
team_name,region,seed,logo_url,tournament_name
Team 1,East,1,,Tournament Name
Team 2,East,2,,Tournament Name
Team 3,East,3,,Tournament Name
Team 4,East,4,,Tournament Name
Team 5,East,5,,Tournament Name
Team 6,East,6,,Tournament Name
Team 7,East,7,,Tournament Name
Team 8,East,8,,Tournament Name
Team 9,East,9,,Tournament Name
Team 10,East,10,,Tournament Name
Team 11,East,11,,Tournament Name
Team 12,East,12,,Tournament Name
Team 13,East,13,,Tournament Name
Team 14,East,14,,Tournament Name
Team 15,East,15,,Tournament Name
Team 16,East,16,,Tournament Name
Team 1,West,1,,Tournament Name
Team 2,West,2,,Tournament Name
... (repeat for West, South, and Midwest regions)
```

## Best Practices

1. **Backup your database** before running large imports
2. **Test with a small CSV** first to verify the format
3. **Use consistent tournament names** across all rows
4. **Include logo URLs** when available for better visual representation
5. **Verify seed numbers** are unique within each region (1-16)
6. **Check console output** for any warnings or errors
