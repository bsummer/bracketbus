# Testing Guide

This document describes the automated testing setup for the Tournament Admin Management feature.

## Test Structure

### Unit Tests
Unit tests are located alongside their source files with the `.spec.ts` extension:
- `src/tournaments/tournaments.service.spec.ts` - Tests for TournamentsService
- `src/tournament-teams/tournament-teams.service.spec.ts` - Tests for TournamentTeamsService
- `src/games/games.service.spec.ts` - Tests for GamesService
- `src/common/guards/admin.guard.spec.ts` - Tests for AdminGuard

### Integration/E2E Tests
E2E tests are located in the `test/` directory:
- `test/tournaments.e2e-spec.ts` - E2E tests for tournament endpoints
- `test/tournament-teams.e2e-spec.ts` - E2E tests for tournament teams endpoints
- `test/tournament-games.e2e-spec.ts` - E2E tests for tournament games endpoints

## Running Tests

### Unit Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:cov
```

### E2E Tests
```bash
npm run test:e2e
```

**Note:** E2E tests require:
- A running database
- Seeded data (admin and user1 accounts)
- The backend server to be running (or tests will start it)

## Test Coverage

### Unit Tests Coverage

#### TournamentsService
- ✅ `findAll()` - Returns all tournaments sorted by start date
- ✅ `findOne()` - Returns tournament by ID, throws NotFoundException if not found
- ✅ `create()` - Creates tournament, throws ConflictException for duplicate names
- ✅ `update()` - Updates tournament, validates duplicate names
- ✅ `remove()` - Deletes tournament, throws NotFoundException if not found

#### TournamentTeamsService
- ✅ `create()` - Creates tournament team, validates:
  - Tournament exists
  - Team exists
  - Team not already in tournament
  - Region+seed combination is unique
- ✅ `update()` - Updates tournament team, validates region+seed conflicts
- ✅ `findAllByTournament()` - Returns all teams for a tournament
- ✅ `findOne()` - Returns tournament team by ID
- ✅ `remove()` - Deletes tournament team

#### GamesService
- ✅ `createForTournament()` - Round 1:
  - Validates region is required
  - Validates teams are required
  - Validates teams exist in tournament with matching region
  - Validates teams not already in another game in the round
  - Validates game number uniqueness
- ✅ `createForTournament()` - Round 2+:
  - Validates parent games are required
  - Validates parent games are from previous round
  - Validates parent games not already used
  - Validates game number uniqueness
- ✅ `findAllByTournament()` - Returns games for tournament, optionally filtered by round
- ✅ `updateForTournament()` - Updates game
- ✅ `removeForTournament()` - Deletes game

#### AdminGuard
- ✅ Allows access for admin users
- ✅ Denies access for non-admin users
- ✅ Denies access if user not authenticated
- ✅ Denies access if user not found in database

### E2E Tests Coverage

#### Tournament Endpoints
- ✅ GET `/api/tournaments` - Returns tournaments for admin, 403 for non-admin
- ✅ POST `/api/tournaments` - Creates tournament, validates duplicate names
- ✅ GET `/api/tournaments/:id` - Returns tournament by ID, 404 if not found
- ✅ PUT `/api/tournaments/:id` - Updates tournament
- ✅ DELETE `/api/tournaments/:id` - Deletes tournament

#### Tournament Teams Endpoints
- ✅ POST `/api/tournaments/:tournamentId/teams` - Adds team to tournament
- ✅ GET `/api/tournaments/:tournamentId/teams` - Returns all teams for tournament
- ✅ Validates duplicate team in tournament (409)
- ✅ Validates duplicate region+seed combination (409)

#### Tournament Games Endpoints
- ✅ POST `/api/tournaments/:tournamentId/games` - Round 1:
  - Creates game with region and teams
  - Validates duplicate game number (409)
  - Validates region required (400)
- ✅ POST `/api/tournaments/:tournamentId/games` - Round 2+:
  - Creates game with parent games
  - Validates parent games required (400)
  - Validates parent game from correct round (400)
- ✅ GET `/api/tournaments/:tournamentId/games` - Returns games, optionally filtered by round

## Troubleshooting

### Jest Configuration Issues
If you encounter issues with Jest, try:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. Ensure all Jest dependencies are installed:
   ```bash
   npm install --save-dev jest @types/jest @nestjs/testing ts-jest supertest @types/supertest
   ```

### E2E Test Database Issues
E2E tests use the actual database. Ensure:
1. Database is running
2. Migrations have been run
3. Seed data exists (admin and user1 accounts)

### Test Failures
- Check that all dependencies are installed
- Verify that the database connection is working
- Ensure test data is properly set up

## Adding New Tests

When adding new features:
1. Add unit tests for service methods
2. Add E2E tests for new endpoints
3. Update this documentation with new test coverage

## Best Practices

1. **Unit Tests**: Mock all external dependencies (repositories, services)
2. **E2E Tests**: Use actual database but clean up test data after tests
3. **Test Isolation**: Each test should be independent and not rely on other tests
4. **Test Data**: Use factories or builders for creating test data
5. **Assertions**: Be specific with assertions - test both success and error cases

