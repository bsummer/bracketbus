# Tournament Admin Management - Validation & Business Rules

This document outlines the validation rules and business logic for the Tournament Admin Management feature.

## Tournament Management

### Validation Rules
- **Name**: Required, must be unique across all tournaments
- **Start Date**: Required, must be a valid date string (ISO 8601 format)

### Business Rules
- Tournament names must be unique - attempting to create or update with a duplicate name will result in a `409 Conflict` error
- Tournaments are sorted by start date (newest first) when listing
- Deleting a tournament may cascade delete related pools and games (depending on entity configuration)

## Tournament Teams

### Validation Rules
- **Team ID**: Required, must be a valid UUID of an existing team
- **Region**: Required, must be one of: `East`, `West`, `South`, `Midwest`
- **Seed**: Required, must be an integer between 1 and 16 (inclusive)

### Business Rules
- Each team can only be assigned **once** per tournament
  - Attempting to add the same team twice will result in a `409 Conflict` error
- The combination of **region + seed** must be unique per tournament
  - Example: Only one team can be "East #1" in a given tournament
  - Attempting to assign a duplicate region+seed will result in a `409 Conflict` error
- Teams are sorted by region (alphabetically), then by seed (ascending) when listing

### Validation Flow
1. Verify tournament exists (404 if not found)
2. Verify team exists (404 if not found)
3. Check if team already in tournament (409 if duplicate)
4. Check if region+seed combination already used (409 if duplicate)
5. Create tournament team assignment

## Tournament Games

### Round 1 Games

#### Required Fields
- `round`: Must be `1`
- `gameNumber`: Required, must be unique per tournament and round
- `region`: Required, must be one of: `East`, `West`, `South`, `Midwest`
- `team1Id`: Required, must be a valid UUID
- `team2Id`: Required, must be a valid UUID

#### Validation Rules
- `team1Id` and `team2Id` must be different teams
- Both teams must exist in the tournament
- Both teams must be assigned to the same region as specified in `region`
- Teams cannot appear in multiple games within the same round
- Game number must be unique per tournament and round

#### Business Rules
- Round 1 games represent the initial matchups within a region
- Teams are matched based on their region assignment
- Each team can only play in one Round 1 game

### Round 2+ Games

#### Required Fields
- `round`: Must be `2` or higher
- `gameNumber`: Required, must be unique per tournament and round
- `parentGame1Id`: Required, must be a valid UUID of a game from the previous round
- `parentGame2Id`: Required, must be a valid UUID of a game from the previous round

#### Optional Fields
- `region`: Optional, can be set for organizational purposes

#### Validation Rules
- `parentGame1Id` and `parentGame2Id` must be different games
- Both parent games must exist
- Both parent games must be from the same tournament
- Both parent games must be from round `(currentRound - 1)`
- Parent games cannot be reused in the same round (each parent game can only be used once per round)
- Game number must be unique per tournament and round

#### Business Rules
- Round 2+ games represent matchups between winners of previous round games
- Parent games determine which teams will advance (winners of parent games)
- Each parent game can only be used once per round to prevent duplicate matchups

### Game Status

Games can have the following statuses:
- `scheduled`: Game is scheduled but not yet started
- `in_progress`: Game is currently being played
- `completed`: Game has finished

Default status is `scheduled` when creating a new game.

### Game Numbering

- Game numbers must be unique per tournament and round
- Game numbers are typically sequential (1, 2, 3, ...) but this is not enforced
- Attempting to create a game with a duplicate game number in the same round will result in a `409 Conflict` error

## Error Responses

### 400 Bad Request
- Missing required fields
- Invalid field values (e.g., seed out of range, invalid region)
- Validation rule violations (e.g., same team for team1 and team2)

### 404 Not Found
- Tournament not found
- Team not found
- Game not found
- Tournament team not found

### 409 Conflict
- Duplicate tournament name
- Team already in tournament
- Duplicate region+seed combination
- Duplicate game number in same round
- Team already playing in another game in the same round
- Parent game already used in another game in the same round

### 403 Forbidden
- Non-admin user attempting to access admin-only endpoints
- User not authenticated

## Admin Authorization

All tournament management endpoints require:
1. User to be authenticated (valid JWT token)
2. User to have the `admin` role

The `@Admin()` decorator enforces both requirements. Non-admin users will receive a `403 Forbidden` response.

