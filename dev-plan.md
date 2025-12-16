## Tech Stack
### Backend Services
- typescript
- postgreSQL database
- RESTful APIs
- NestJS framework
- TypeORM
- class-validator (input validation)
- Passport.js / JWT (authentication)
- Pino (logging)

### Frontend app
- React Native
- React
- XCode
- CocoaPods
- iOS Simulator
- Typescript
- React Navigation
- Expo
- Axios (HTTP client)
- AsyncStorage (local storage)

### Web app
- Vite + React
- Typescript


### Testing frameworks
- Jest
- React Native Testing Library
- Supertest (API integration testing)
- Test data management and mocking strategy

## Project specs
An app for March Madness brackets and friend competition is a sports-themed app that lets users create personalized NCAA tournament brackets to compete against friends, family, and coworkers. It allows users to make picks, join or create private pools, and track how their bracket performs against others in real-time. Many of these apps also provide tools like stats, game analysis, and live score updates to help users strategize their picks. 

### Functional Requirements
- Users need to be authenticated to visit any page on the app EXCEPT the pool display page. However, if they aren't authenticated there are no buttons on the display page to go to the other pages on the site.
- A user must be authenticated to create a pool or bracket.
- A pool is associated with a tournament. A user can create multiple pools per tournament. A tournament can be associated with many pools.
- A bracket is associated with a user and a pool. The user must be a member of that pool to create a bracket in that pool. A user can only create one bracket per pool they are in.
- A user is a member of any pool they create.
- A user can join a pool using the pool's join code. The join code is a unique 8 digit alpha-numeric string associated with the pool. 
- An existing user can be added to the pool by an Admin or the person who created the pool. Non-admins, and members who did not create the pool can not add members. 
- An admin or the pool creator can kick members out of the pool.
- When logged in, the header on every page has a button to log out.
- ✅ Bracket creation: Users can fill out their bracket with their predicted winners for each game in the tournament.
- ✅ Bracket creation: User will fill out all the rounds of a tournament when they create their brackets. 
- ✅ Pool play: Users can create private pools to compete with friends and family, with features to invite them to join.
- ✅ Scoring and ranking: The app tracks each player's bracket as games progress and updates the standings within the pool and overall leaderboards. Some apps have custom scoring options, such as awarding points for upsetting higher seeds.
- This service and app should have 100% unit and integration test coverage. However, we don't want to have excess tests, so if functionality is covered by an integration test, it doesn't automatically need a unit test.
- ✅ Users will log into the app using a username and password. For the initial version, users will be manually entered into the database. A JWT will be used for user tracking and session management. 
- ✅ The tournament data, the teams and who plays who is which round, will be entered manually into the database. Updates on game scores will also be entered manually.

### To Do
- A user has to belong to a Pool to create a bracket. A user can only create one bracket associated with each pool. If member U is in Pool P1 and Pool P2, they can ONLY create one bracket that is associated with P1 and a second that is associated with P2. When going to the Pool page for P1, U will be shown once associated with their bracket for P1. When going to the Pool page for P2, U will be shown once associated with their bracket for P2. 

### Authentication & Authorization
- ✅ User registration/login with username and password
- ✅ JWT tokens for session management
- ✅ Password hashing (bcrypt)
- ✅ User profile management
- ✅ Initial version: users manually entered into database
- Future: self-registration, password reset functionality

### Data Models / Database Schema
Core entities to define:
- **Users**: id, username, password_hash, created_at, updated_at
- **Tournaments**: id, name, start_date, created_at
- **Brackets**: id, user_id, name, created_at, locked_at
- **Pools**: id, name, tournament_id, creator_id, invite_code, created_at
- **PoolMembers**: pool_id, user_id, joined_at, status (enum: active, left), left_at
- **Games**: id, round, tournament_id, game_number, parent_game1, parent_game2, team1_id, team2_id, winner_id, score_team1, score_team2, game_date, status
- **Teams**: id, name, seed, region, logoUrl
- **Picks**: id, bracket_id, game_id, predicted_winner_id, points_earned
- **Scores**: bracket_id, total_points, last_updated

Relationships:
- Users → Brackets (one-to-many)
- Users → PoolMembers (many-to-many via Pools)
- Tournaments → Brackets (one-to-many) 
- Tournaments → Games (one-to-many) 
- Brackets → Picks (one-to-many)
- Games → Picks (one-to-many)
- Teams → Games (many-to-many, via team1_id/team2_id)

### API Endpoints
Core REST endpoints needed:
- **Authentication**:
  - `POST /api/auth/login` - User login
  - `POST /api/auth/logout` - User logout
  - `GET /api/auth/me` - Get current user

- **Brackets**:
  - `GET /api/brackets` - Get user's brackets
  - `POST /api/brackets` - Create new bracket
  - `GET /api/brackets/:id` - Get bracket details
  - `PUT /api/brackets/:id` - Update bracket picks (if not locked)
  - `DELETE /api/brackets/:id` - Delete bracket

- **Pools**:
  - `GET /api/pools` - Get user's pools
  - `POST /api/pools` - Create new pool
  - `GET /api/pools/:id` - Get pools details
  - `POST /api/pools/:id/join` - Join pool (via invite code)
  - `GET /api/pools/:id/leaderboard` - Get pool leaderboard
  - `GET /api/pools/:id/members` - Get pool members

- **Games**:
  - `GET /api/games` - Get all games
  - `GET /api/games/:id` - Get game details
  - `PUT /api/games/:id` - Update game result (admin only)

- **Teams**:
  - `GET /api/teams` - Get all teams

### Bracket Locking Mechanism
- ✅ Brackets must lock before the tournament starts
- ✅ Lock time: configurable (e.g., first game tip-off time)
- ✅ Timezone handling: use UTC for lock time, display in user's timezone
- ✅ After locking: users cannot edit picks
- ✅ Before locking: users can modify picks freely
- ✅ Lock status visible in UI

### Invitation System
- ✅ Pools have unique invite codes (generated on creation)
- ✅ Users can share invite codes to invite friends
- ✅ Initial version: manual code sharing
- Future: in-app sharing, email invitations, shareable links
- ✅ Join flow: user enters invite code to join pool

### Development Environment Setup
- Local development setup instructions
- Environment variables (.env files for backend, .env.local for frontend)
- Database setup: PostgreSQL local instance
- Database migrations: TypeORM migrations
- Seed data: scripts to populate initial tournament data, test users
- Development server: NestJS dev server, Expo dev server
- Hot reloading enabled for both frontend and backend

### Security Considerations
- API authentication: JWT tokens required for protected endpoints
- Input validation: class-validator for all user inputs
- SQL injection prevention: TypeORM parameterized queries
- Rate limiting: implement on API endpoints (prevent abuse)
- CORS configuration: allow requests from mobile app
- Password security: bcrypt hashing, minimum password requirements
- JWT secret: stored in environment variables, not in code
- HTTPS: required for production (not needed for local dev)

### Error Handling & Logging
- Error handling strategy: consistent error response format
- HTTP status codes: proper use (200, 201, 400, 401, 403, 404, 500)
- Error messages: user-friendly messages, detailed logs for debugging
- Logging framework: Winston or Pino for structured logging
- Log levels: error, warn, info, debug
- Error reporting: log errors with context (user, endpoint, timestamp)
- Frontend error handling: try-catch blocks, error boundaries

### Deployment Strategy
- Initial: Run on laptop for development and testing
- Future deployment options:
  - Backend: Heroku, Railway, AWS, DigitalOcean
  - Database: Managed PostgreSQL (Heroku Postgres, AWS RDS, etc.)
  - Mobile app: App Store (iOS), Google Play Store (Android)
- Environment management: separate configs for dev/staging/prod
- Database migrations: run migrations as part of deployment
- Environment variables: secure storage for production secrets
- Build process: automated builds for mobile apps (Expo EAS Build or React Native CLI)


### Follow-up version features
- Live updates: Many apps provide live scores, game results, and other tournament information directly within the app.
- Tools and analysis: Some apps offer additional features to help users make informed choices, such as team stats, game previews, and expert analysis.
- Multiple brackets: Users can often create and manage multiple brackets to enter into different pools or try out different strategies. 

#### Examples of such apps
- ESPN Tournament Challenge: A popular and free option that includes men's and women's tournaments, with tools like the Bracket Analyzer and BracketCast for live scores.
- NCAA March Madness Live: The official app from the NCAA that allows users to fill out brackets, watch games on certain platforms, and receive alerts.
- Bracket Tracker: An app that allows users to create custom scoring and themes for their pools and manage multiple brackets. 

### Non-functional requirements
- Availability > Consistency
- The scale, for the near future, is going to be very low. Just a few players.
- This will initially run off my laptop
- This will start as an iOS app

## Scripts
- ✅ A script to seed the database. This script will default the tournament name to "2025 NCAA Championship Tournament" or take the info from the `tournaments.json` file. This script will read the teams from a json file, `teams.json`. When setting games, the teams will be matched up by region, with the highest seed playing the lowest seed, and so on. There will be region play, until there is a region winner, and then the winners will compete. 
- ✅ A script to reset the database. This script will drop all the tables in the apps database, in the dev environment, recreate the tables and then seed the tables. 

## Documentation
- ✅ A README file, which gives information about the app, how to set up the app to run in your local environment (desktop), and how to run commands to start the backend service, start the web service, seed the database, reset the database, and start the mobile simulator.
- ✅ A md file on how to set up the database.
- ✅ A md file on how to test the API endpoints using curl or Postman.
- ✅ A md file on how to set up your local development environment for a linux machine or a mac.  


