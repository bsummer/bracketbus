# Tournament Admin Management Pages - Development Plan

## Overview
This plan outlines the development of admin-only pages for managing tournaments, tournament teams, and tournament games. All pages require admin role authentication and include comprehensive validation on both frontend and backend.

## Prerequisites
- Existing authentication system (JWT, guards)
- Tournament, TournamentTeam, and Game entities exist
- Admin role system in place (or needs to be implemented)
- Existing admin pages pattern (AdminUserListPage, etc.)

---

## Phase 1: Backend Foundation & Authorization

### Task 1.1: Implement Admin Role System
**Status:** ✅ Completed

**Backend Changes:**
- [x] Add `role` field to User entity (if not exists)
  - Type: enum ('user', 'admin')
  - Default: 'user'
- [x] Create database migration for role field
- [x] Update seed script to set admin role for admin user
- [x] Create `AdminGuard` that checks user role
  - Location: `backend/src/common/guards/admin.guard.ts`
  - Extends existing guard pattern
  - Checks if user.role === 'admin'
- [x] Create `@Admin()` decorator for convenience
  - Location: `backend/src/common/decorators/admin.decorator.ts`

**Files to Create:**
- `backend/src/common/guards/admin.guard.ts`
- `backend/src/common/decorators/admin.decorator.ts`

**Files to Modify:**
- `backend/src/common/entities/user.entity.ts`
- `backend/src/database/migrations/[timestamp]-AddRoleToUsers.ts`
- `backend/src/database/seeds/seed.ts`

**Estimated Time:** 2-3 hours

---

### Task 1.2: Create Tournaments Module
**Status:** ✅ Completed

**Backend Changes:**
- [x] Create tournaments module structure
  - `backend/src/tournaments/tournaments.module.ts`
  - `backend/src/tournaments/tournaments.service.ts`
  - `backend/src/tournaments/tournaments.controller.ts`
- [x] Create DTOs:
  - `CreateTournamentDto` - name (required), startDate (required)
  - `UpdateTournamentDto` - name (optional), startDate (optional)
- [x] Implement service methods:
  - `findAll()` - Get all tournaments
  - `findOne(id)` - Get tournament by ID
  - `create(dto)` - Create tournament with validation
  - `update(id, dto)` - Update tournament
  - `remove(id)` - Delete tournament (consider cascade)
- [x] Implement controller endpoints:
  - `GET /api/tournaments` - List all (admin only)
  - `POST /api/tournaments` - Create (admin only)
  - `GET /api/tournaments/:id` - Get details (admin only)
  - `PUT /api/tournaments/:id` - Update (admin only)
  - `DELETE /api/tournaments/:id` - Delete (admin only)
- [x] Add validation:
  - Tournament name must be unique
  - Start date must be valid date
- [x] Register module in `app.module.ts`

**Files to Create:**
- `backend/src/tournaments/tournaments.module.ts`
- `backend/src/tournaments/tournaments.service.ts`
- `backend/src/tournaments/tournaments.controller.ts`
- `backend/src/tournaments/dto/create-tournament.dto.ts`
- `backend/src/tournaments/dto/update-tournament.dto.ts`

**Files to Modify:**
- `backend/src/app.module.ts`

**Estimated Time:** 4-5 hours

---

### Task 1.3: Create Tournament Teams Module
**Status:** ✅ Completed

**Backend Changes:**
- [x] Create tournament-teams module structure
  - `backend/src/tournament-teams/tournament-teams.module.ts`
  - `backend/src/tournament-teams/tournament-teams.service.ts`
  - `backend/src/tournament-teams/tournament-teams.controller.ts`
- [x] Create DTOs:
  - `CreateTournamentTeamDto` - tournamentId, teamId, region, seed
  - `UpdateTournamentTeamDto` - region, seed (optional)
- [x] Implement service methods:
  - `findAllByTournament(tournamentId)` - Get all teams for tournament
  - `findOne(id)` - Get tournament team by ID
  - `create(dto)` - Create with validation
  - `update(id, dto)` - Update with validation
  - `remove(id)` - Delete tournament team
- [x] Implement controller endpoints:
  - `GET /api/tournaments/:tournamentId/teams` - List teams (admin only)
  - `POST /api/tournaments/:tournamentId/teams` - Add team (admin only)
  - `PUT /api/tournaments/:tournamentId/teams/:id` - Update (admin only)
  - `DELETE /api/tournaments/:tournamentId/teams/:id` - Remove (admin only)
- [x] Add validation:
  - Team not already in tournament (unique constraint)
  - (region, seed) combination not already used
  - Region must be: 'East', 'West', 'South', 'Midwest'
  - Seed must be 1-16
- [x] Handle unique constraint violations with proper error messages

**Files to Create:**
- `backend/src/tournament-teams/tournament-teams.module.ts`
- `backend/src/tournament-teams/tournament-teams.service.ts`
- `backend/src/tournament-teams/tournament-teams.controller.ts`
- `backend/src/tournament-teams/dto/create-tournament-team.dto.ts`
- `backend/src/tournament-teams/dto/update-tournament-team.dto.ts`

**Files to Modify:**
- `backend/src/app.module.ts`
- `backend/src/common/entities/tournament-team.entity.ts` (verify unique constraints)

**Estimated Time:** 5-6 hours

---

### Task 1.4: Enhance Games Module for Tournament Management
**Status:** ✅ Completed

**Backend Changes:**
- [x] Extend games controller with tournament-specific endpoints:
  - `GET /api/tournaments/:tournamentId/games` - Get all games for tournament
  - `GET /api/tournaments/:tournamentId/games?round=X` - Get games by round
  - `POST /api/tournaments/:tournamentId/games` - Create game (admin only)
  - `PUT /api/tournaments/:tournamentId/games/:id` - Update game (admin only)
  - `DELETE /api/tournaments/:tournamentId/games/:id` - Delete game (admin only)
- [x] Create DTOs:
  - `CreateTournamentGameDto` - handles Round 1 vs Round 2+ logic
  - `UpdateTournamentGameDto` - update game details
- [x] Enhance games service:
  - `findAllByTournament(tournamentId, round?)` - Filter by tournament/round
  - `createForTournament(tournamentId, dto)` - Create with validation
  - `updateForTournament(id, dto)` - Update with validation
- [x] Add validation logic:
  - Round 1: region required, team1Id/team2Id required, teams must exist in tournament with matching region
  - Round 2+: parentGame1Id/parentGame2Id required, parent games must be from previous round
  - Round 2: Allow region + seed OR parent games (but not both) - Note: region+seed implementation deferred (requires parent game winners)
  - Game number unique per (tournament, round)
  - Team can only appear in one game per round
  - Validate parent games are from (currentRound - 1)
- [x] Handle business rule: Team (by seed+region or parent game) can only appear once per round

**Files to Modify:**
- `backend/src/games/games.controller.ts`
- `backend/src/games/games.service.ts`
- `backend/src/games/dto/create-tournament-game.dto.ts` (new)
- `backend/src/games/dto/update-tournament-game.dto.ts` (new)

**Files to Create:**
- `backend/src/games/dto/create-tournament-game.dto.ts`
- `backend/src/games/dto/update-tournament-game.dto.ts`

**Estimated Time:** 6-8 hours

---

## Phase 2: Frontend API Integration

### Task 2.1: Create Tournaments API Client
**Status:** ✅ Completed

**Frontend Changes:**
- [x] Create `web/src/api/tournaments.ts`
- [x] Define TypeScript interfaces:
  - `Tournament` - id, name, startDate, createdAt, updatedAt
  - `CreateTournamentDto`
  - `UpdateTournamentDto`
- [x] Implement API methods:
  - `getAll()` - Get all tournaments
  - `getOne(id)` - Get tournament by ID
  - `create(data)` - Create tournament
  - `update(id, data)` - Update tournament
  - `remove(id)` - Delete tournament

**Files to Create:**
- `web/src/api/tournaments.ts`

**Estimated Time:** 1 hour

---

### Task 2.2: Create Tournament Teams API Client
**Status:** ✅ Completed

**Frontend Changes:**
- [x] Create `web/src/api/tournament-teams.ts`
- [x] Define TypeScript interfaces:
  - `TournamentTeam` - id, tournamentId, teamId, region, seed, team (relation)
  - `CreateTournamentTeamDto`
  - `UpdateTournamentTeamDto`
- [x] Implement API methods:
  - `getAllByTournament(tournamentId)` - Get all teams for tournament
  - `getOne(id)` - Get tournament team by ID
  - `create(tournamentId, data)` - Add team to tournament
  - `update(tournamentId, id, data)` - Update tournament team
  - `remove(tournamentId, id)` - Remove team from tournament

**Files to Create:**
- `web/src/api/tournament-teams.ts`

**Estimated Time:** 1 hour

---

### Task 2.3: Enhance Games API Client
**Status:** ✅ Completed

**Frontend Changes:**
- [x] Update `web/src/api/games.ts`
- [x] Add tournament-specific methods:
  - `getAllByTournament(tournamentId, round?)` - Get games for tournament
  - `createForTournament(tournamentId, data)` - Create game
  - `updateForTournament(tournamentId, id, data)` - Update game
  - `removeFromTournament(tournamentId, id)` - Delete game
- [x] Add interfaces for tournament game creation/update

**Files to Modify:**
- `web/src/api/games.ts`

**Estimated Time:** 1-2 hours

---

## Phase 3: Frontend Pages - Tournaments List

### Task 3.1: Create Tournaments List Page
**Status:** ⏳ Pending

**Frontend Changes:**
- [ ] Create `web/src/pages/AdminTournamentsPage.tsx`
- [ ] Create `web/src/pages/AdminTournamentsPage.css`
- [ ] Implement features:
  - Display tournaments in table/card layout
  - Show tournament name, start date
  - "Create New Tournament" button at top
  - Per tournament: "Teams" link → `/admin/tournaments/:id/teams`
  - Per tournament: "Games" link → `/admin/tournaments/:id/games`
  - Loading states
  - Error handling
  - Empty state when no tournaments
- [ ] Add route in `App.tsx`: `/admin/tournaments`
- [ ] Add admin check/redirect for non-admin users

**Files to Create:**
- `web/src/pages/AdminTournamentsPage.tsx`
- `web/src/pages/AdminTournamentsPage.css`

**Files to Modify:**
- `web/src/App.tsx`

**Estimated Time:** 3-4 hours

---

### Task 3.2: Create Tournament Form (Create/Edit)
**Status:** ⏳ Pending

**Frontend Changes:**
- [ ] Create `web/src/pages/AdminCreateTournamentPage.tsx`
- [ ] Create `web/src/pages/AdminCreateTournamentPage.css`
- [ ] Implement form:
  - Tournament Name (text input, required)
  - Start Date (date picker, required)
  - Submit button
  - Cancel/Back button
- [ ] Add validation:
  - Name required, must be unique (check on submit)
  - Start date required, must be valid date
- [ ] Handle errors:
  - Display validation errors inline
  - Show API error messages
- [ ] On success: Redirect to tournaments list
- [ ] Add route: `/admin/tournaments/new`
- [ ] Optional: Add edit route `/admin/tournaments/:id/edit`

**Files to Create:**
- `web/src/pages/AdminCreateTournamentPage.tsx`
- `web/src/pages/AdminCreateTournamentPage.css`

**Files to Modify:**
- `web/src/App.tsx`

**Estimated Time:** 2-3 hours

---

## Phase 4: Frontend Pages - Tournament Teams

### Task 4.1: Create Tournament Teams List Page
**Status:** ⏳ Pending

**Frontend Changes:**
- [ ] Create `web/src/pages/AdminTournamentTeamsPage.tsx`
- [ ] Create `web/src/pages/AdminTournamentTeamsPage.css`
- [ ] Implement features:
  - Display tournament name at top
  - Table showing all teams in tournament
  - Columns: Team Name, Region, Seed, Actions (Edit, Delete)
  - "Add Team" button
  - Loading states
  - Error handling
- [ ] Add route: `/admin/tournaments/:tournamentId/teams`
- [ ] Fetch teams using tournament ID from URL params

**Files to Create:**
- `web/src/pages/AdminTournamentTeamsPage.tsx`
- `web/src/pages/AdminTournamentTeamsPage.css`

**Files to Modify:**
- `web/src/App.tsx`

**Estimated Time:** 3-4 hours

---

### Task 4.2: Create Tournament Team Form (Add/Edit)
**Status:** ⏳ Pending

**Frontend Changes:**
- [ ] Create add/edit form (modal or inline)
- [ ] Form fields:
  - Team dropdown: All teams from teams table (exclude teams already in tournament)
  - Region dropdown: 'East', 'West', 'South', 'Midwest' (required)
  - Seed dropdown: 1-16 (required)
- [ ] Add validation:
  - Frontend: All fields required, seed 1-16, team not already in tournament
  - Display validation errors inline
- [ ] Handle API errors:
  - "This team is already in the tournament"
  - "This seed/region combination is already assigned"
- [ ] On success: Refresh teams list, show success message
- [ ] Delete functionality:
  - Delete button with confirmation dialog
  - On confirm: Delete and refresh list

**Files to Modify:**
- `web/src/pages/AdminTournamentTeamsPage.tsx`

**Estimated Time:** 4-5 hours

---

## Phase 5: Frontend Pages - Tournament Games

### Task 5.1: Create Tournament Games List Page
**Status:** ⏳ Pending

**Frontend Changes:**
- [ ] Create `web/src/pages/AdminTournamentGamesPage.tsx`
- [ ] Create `web/src/pages/AdminTournamentGamesPage.css`
- [ ] Implement features:
  - Display tournament name at top
  - Round filter/tabs to view games by round
  - Table showing games for selected round
  - Columns: Round, Game Number, Region (if applicable), Team 1, Team 2, Status, Actions
  - "Add Game" button
  - Loading states
  - Error handling
- [ ] Add route: `/admin/tournaments/:tournamentId/games`
- [ ] Fetch games filtered by round when round tab selected

**Files to Create:**
- `web/src/pages/AdminTournamentGamesPage.tsx`
- `web/src/pages/AdminTournamentGamesPage.css`

**Files to Modify:**
- `web/src/App.tsx`

**Estimated Time:** 4-5 hours

---

### Task 5.2: Create Tournament Game Form - Round 1
**Status:** ⏳ Pending

**Frontend Changes:**
- [ ] Create form for Round 1 games
- [ ] Form fields:
  - Round: 1 (fixed/disabled)
  - Game Number: Number input (required, unique for round)
  - Region: Dropdown - 'East', 'West', 'South', 'Midwest' (required)
  - Team 1: Dropdown filtered by tournament teams in selected region
    - Format: "Seed X - Team Name"
    - Required
  - Team 2: Dropdown filtered by tournament teams in selected region
    - Format: "Seed X - Team Name"
    - Required
  - Game Date: Date picker (optional)
  - Status: Dropdown - 'scheduled', 'in_progress', 'completed' (default: 'scheduled')
- [ ] Add validation:
  - Frontend: Region, Team 1, Team 2 required; Team 1 ≠ Team 2
  - Game number unique per round (check existing games)
- [ ] Handle API errors:
  - Game number already exists
  - Team validation errors
  - Business rule violations

**Files to Modify:**
- `web/src/pages/AdminTournamentGamesPage.tsx`

**Estimated Time:** 5-6 hours

---

### Task 5.3: Create Tournament Game Form - Round 2+
**Status:** ⏳ Pending

**Frontend Changes:**
- [ ] Create form for Round 2+ games
- [ ] Form fields:
  - Round: Number input (required, must be 2+)
  - Game Number: Number input (required, unique for round)
  - Region: Dropdown - 'East', 'West', 'South', 'Midwest' (optional, nullable)
  - Parent Game 1: Dropdown showing games from previous round
    - Format: "Game X - Round Y"
    - Required
  - Parent Game 2: Dropdown showing games from previous round
    - Format: "Game X - Round Y"
    - Required
  - Game Date: Date picker (optional)
  - Status: Dropdown - 'scheduled', 'in_progress', 'completed' (default: 'scheduled')
- [ ] Special handling for Round 2:
  - Allow region + seed OR parent games (but not both)
  - If region/seed selected, hide parent games
  - If parent games selected, hide region/seed
- [ ] Add validation:
  - Frontend: Parent Game 1 and Parent Game 2 required; Parent Game 1 ≠ Parent Game 2
  - Round must be sequential (previous round must exist)
  - Game number unique per round
- [ ] Handle API errors:
  - Parent games validation
  - Business rule violations
  - Round sequence errors

**Files to Modify:**
- `web/src/pages/AdminTournamentGamesPage.tsx`

**Estimated Time:** 6-8 hours

---

## Phase 6: Navigation & Integration

### Task 6.1: Update Header Navigation
**Status:** ⏳ Pending

**Frontend Changes:**
- [ ] Update `web/src/components/common/Header.tsx`
- [ ] Add "Tournaments" link under Admin dropdown
- [ ] Link should navigate to `/admin/tournaments`
- [ ] Ensure admin check is in place (only show for admin users)

**Files to Modify:**
- `web/src/components/common/Header.tsx`

**Estimated Time:** 30 minutes

---

### Task 6.2: Add Admin Route Protection
**Status:** ⏳ Pending

**Frontend Changes:**
- [ ] Create `AdminRoute` component (similar to `ProtectedRoute`)
- [ ] Check if user is admin
- [ ] Redirect to dashboard if not admin
- [ ] Apply to all tournament admin routes:
  - `/admin/tournaments`
  - `/admin/tournaments/new`
  - `/admin/tournaments/:id/edit`
  - `/admin/tournaments/:tournamentId/teams`
  - `/admin/tournaments/:tournamentId/games`

**Files to Create:**
- `web/src/components/common/AdminRoute.tsx` (or add to existing route component)

**Files to Modify:**
- `web/src/App.tsx`
- `web/src/context/AuthContext.tsx` (ensure admin role is available)

**Estimated Time:** 1-2 hours

---

## Phase 7: Testing & Refinement

### Task 7.1: Backend Testing
**Status:** ⏳ Pending

**Testing Checklist:**
- [ ] Test all tournament endpoints with admin user
- [ ] Test all tournament endpoints with non-admin user (should fail)
- [ ] Test tournament creation with duplicate name (should fail)
- [ ] Test tournament team creation with duplicate team (should fail)
- [ ] Test tournament team creation with duplicate (region, seed) (should fail)
- [ ] Test game creation Round 1 with valid data
- [ ] Test game creation Round 1 with duplicate game number (should fail)
- [ ] Test game creation Round 2+ with valid parent games
- [ ] Test game creation Round 2 with region+seed OR parent games
- [ ] Test game creation with team appearing in multiple games same round (should fail)
- [ ] Test validation errors return proper HTTP status codes
- [ ] Test cascade delete behavior (tournament deletion)

**Estimated Time:** 4-6 hours

---

### Task 7.2: Frontend Testing
**Status:** ⏳ Pending

**Testing Checklist:**
- [ ] Test navigation flow: Admin → Tournaments → Teams/Games
- [ ] Test tournament creation form validation
- [ ] Test tournament team form validation
- [ ] Test tournament game form validation (Round 1)
- [ ] Test tournament game form validation (Round 2+)
- [ ] Test error message display
- [ ] Test loading states
- [ ] Test empty states
- [ ] Test delete confirmations
- [ ] Test admin route protection (non-admin redirected)
- [ ] Test responsive design
- [ ] Test accessibility (keyboard navigation, screen readers)

**Estimated Time:** 4-6 hours

---

### Task 7.3: Edge Cases & Error Handling
**Status:** ⏳ Pending

**Edge Cases to Handle:**
- [ ] Empty tournament list
- [ ] Empty teams list for tournament
- [ ] Empty games list for tournament/round
- [ ] Maximum teams per region (16)
- [ ] Maximum games per round
- [ ] Network errors
- [ ] Invalid tournament ID in URL
- [ ] Concurrent edits (optimistic locking if needed)
- [ ] Large datasets (pagination if needed)

**Estimated Time:** 2-3 hours

---

## Phase 8: Documentation & Cleanup

### Task 8.1: Code Documentation
**Status:** ⏳ Pending

**Documentation Tasks:**
- [ ] Add JSDoc comments to complex functions
- [ ] Document API endpoints in code comments
- [ ] Update README with new endpoints
- [ ] Document validation rules
- [ ] Document business rules

**Estimated Time:** 2-3 hours

---

### Task 8.2: Code Review & Refactoring
**Status:** ⏳ Pending

**Review Checklist:**
- [ ] Follow existing code patterns
- [ ] Consistent error handling
- [ ] Consistent naming conventions
- [ ] Remove console.logs
- [ ] Remove commented code
- [ ] Optimize database queries
- [ ] Check for code duplication
- [ ] Ensure TypeScript types are complete

**Estimated Time:** 2-3 hours

---

## Summary

### Total Estimated Time: 60-80 hours

### Dependencies:
1. Phase 1 must be completed before Phase 2
2. Phase 2 must be completed before Phases 3-5
3. Phase 6 can be done in parallel with Phases 3-5
4. Phase 7 requires all previous phases
5. Phase 8 is final cleanup

### Critical Path:
1. Admin role system (Task 1.1)
2. Backend modules (Tasks 1.2-1.4)
3. API clients (Tasks 2.1-2.3)
4. Frontend pages (Tasks 3.1-5.3)
5. Navigation (Task 6.1-6.2)
6. Testing (Phase 7)

### Notes:
- Consider implementing admin role system first if it doesn't exist
- TournamentTeam entity already exists with unique constraints - verify they match requirements
- Game entity exists - verify it supports all required fields
- Follow existing patterns from AdminUserListPage, AdminCreateUserPage
- Consider using modals for forms vs separate pages (consistency with existing admin pages)
- Add loading skeletons for better UX
- Consider toast notifications for success/error messages