# Local Development Environment Setup

This guide covers setting up the BracketBus development environment on Linux or Mac.

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   - Mac: `brew install node`
   - Linux: `sudo apt install nodejs npm` (Ubuntu/Debian) or use nvm

2. **PostgreSQL** (v12 or higher)
   - Mac: `brew install postgresql@14`
   - Linux: `sudo apt install postgresql postgresql-contrib`

3. **Git**
   - Mac: `brew install git`
   - Linux: `sudo apt install git`

### Verify Installation

```bash
node --version  # Should be v18+
npm --version
psql --version
git --version
```

## Setup Steps

### 1. Clone Repository

```bash
git clone <repository-url>
cd bracketbus
```

### 2. Database Setup

#### Start PostgreSQL

**Mac:**
```bash
brew services start postgresql@14
```

**Linux:**
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE bracketbus;

# Exit
\q
```

### 3. Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_USERNAME=postgres
# DB_PASSWORD=your_password
# DB_DATABASE=bracketbus
# JWT_SECRET=your-secret-key-change-in-production
```

### 4. Seed Database

```bash
cd backend
npm run seed
```

This creates test users and initial tournament data.

### 5. Start Backend

```bash
cd backend
npm run start:dev
```

Backend runs on `http://localhost:3000`

### 6. Web Frontend Setup

```bash
cd web
npm install

# Create .env file (optional, defaults work)
cp .env.example .env
```

### 7. Start Web Frontend

```bash
cd web
npm run dev
```

Web app runs on `http://localhost:5173`

## Development Workflow

1. Start PostgreSQL (if not running as service)
2. Start backend: `cd backend && npm run start:dev`
3. Start web frontend: `cd web && npm run dev`
4. Open browser: `http://localhost:5173`

## Common Commands

### Backend

```bash
npm run start:dev    # Start development server
npm run build        # Build for production
npm run seed         # Seed database
npm run reset        # Reset database
```

### Web Frontend

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

## Troubleshooting

### Port Already in Use

If port 3000 or 5173 is in use:

**Backend:** Change `PORT` in `backend/.env`
**Web:** Vite will automatically use next available port

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Check credentials in `backend/.env`

3. Test connection:
   ```bash
   psql -U postgres -d bracketbus
   ```

### Module Not Found Errors

```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## IDE Setup

### VS Code

Recommended extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- PostgreSQL

### Environment Variables

Create `.vscode/launch.json` for debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "cwd": "${workspaceFolder}/backend"
    }
  ]
}
```

