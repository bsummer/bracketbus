# Database Setup Guide

This guide explains how to set up the PostgreSQL database for BracketBus.

## Prerequisites

- PostgreSQL installed and running
- Access to create databases and users

## Setup Steps

### 1. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE bracketbus;

# Exit psql
\q
```

### 2. Configure Backend

Edit `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=bracketbus
```

### 3. Run Migrations (Development)

In development mode, TypeORM will automatically synchronize the schema. Just start the backend:

```bash
cd backend
npm run start:dev
```

### 4. Seed Database

Populate the database with initial data:

```bash
cd backend
npm run seed
```

This will create:
- Test users
- Tournament from `tournaments.json`
- Teams from `teams.json`
- Game structure (all rounds)

## Reset Database

To drop all tables and start fresh:

```bash
cd backend
npm run reset
npm run seed
```

## Production Setup

For production, use TypeORM migrations instead of synchronize:

1. Generate migration:
```bash
npm run migration:generate -- -n InitialSchema
```

2. Run migration:
```bash
npm run migration:run
```

## Troubleshooting

### Connection Issues

- Verify PostgreSQL is running: `pg_isready`
- Check credentials in `.env`
- Ensure database exists: `psql -U postgres -l`

### Permission Issues

- Ensure user has CREATE DATABASE permission
- Check PostgreSQL authentication settings in `pg_hba.conf`

