# BracketBus

A March Madness bracket competition app that lets users create personalized NCAA tournament brackets to compete against friends, family, and coworkers.

## Features

- User authentication with JWT
- Create and manage tournament brackets
- Create and join pools (groups) to compete with friends
- Track bracket performance and leaderboards
- Public pool display pages (no login required)
- Bracket locking before tournament starts
- One bracket per pool per user

## Tech Stack

### Backend
- NestJS
- TypeScript
- PostgreSQL
- TypeORM
- Passport.js (JWT authentication)
- bcrypt (password hashing)

### Web Frontend
- React 18+
- TypeScript
- Vite
- React Router
- Axios

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Setup

### 1. Database Setup

See [DATABASE_SETUP.md](DATABASE_SETUP.md) for detailed database setup instructions.

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run start:dev
```

The backend will run on `http://localhost:3000`

### 3. Web Frontend Setup

```bash
cd web
npm install
cp .env.example .env
# Edit .env if needed (defaults to http://localhost:3000/api)
npm run dev
```

The web app will run on `http://localhost:5173`

## Database Scripts

### Seed Database

Populates the database with:
- Test users (admin/admin123, user1/user123, user2/user123)
- Tournament data from `tournaments.json`
- Teams from `teams.json`
- Games structure (all rounds)

```bash
cd backend
npm run seed
```

### Reset Database

Drops all tables and recreates them (development only):

```bash
cd backend
npm run reset
npm run seed
```

## API Testing

See [API_TESTING.md](API_TESTING.md) for instructions on testing API endpoints with curl or Postman.

## Development Environment Setup

See [LOCAL_DEV_SETUP.md](LOCAL_DEV_SETUP.md) for detailed setup instructions for Linux or Mac.

## Project Structure

```
bracketbus/
├── backend/          # NestJS backend API
│   ├── src/
│   │   ├── auth/     # Authentication module
│   │   ├── brackets/ # Brackets module
│   │   ├── pools/    # Pools module
│   │   ├── games/    # Games module
│   │   ├── teams/    # Teams module
│   │   └── database/ # Seed scripts
│   └── package.json
├── web/              # React web frontend
│   ├── src/
│   │   ├── api/      # API client
│   │   ├── components/
│   │   ├── pages/
│   │   └── context/  # Auth context
│   └── package.json
├── teams.json        # Team data
├── tournaments.json  # Tournament data
└── README.md
```

## Default Test Users

- **admin** / admin123
- **user1** / user123
- **user2** / user123

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Brackets
- `GET /api/brackets` - Get user's brackets
- `POST /api/brackets` - Create bracket
- `GET /api/brackets/:id` - Get bracket details
- `PUT /api/brackets/:id` - Update bracket
- `DELETE /api/brackets/:id` - Delete bracket

### Pools
- `GET /api/pools` - Get user's pools
- `POST /api/pools` - Create pool
- `GET /api/pools/:id` - Get pool details
- `GET /api/pools/:id/public` - Get public pool view
- `POST /api/pools/:id/join` - Join pool
- `GET /api/pools/:id/leaderboard` - Get leaderboard
- `GET /api/pools/:id/members` - Get members
- `POST /api/pools/:id/members` - Add member
- `DELETE /api/pools/:id/members/:memberId` - Remove member

### Games
- `GET /api/games` - Get all games
- `GET /api/games/:id` - Get game details
- `PUT /api/games/:id` - Update game (admin only)

### Teams
- `GET /api/teams` - Get all teams
- `GET /api/teams/:id` - Get team details

## License

ISC

