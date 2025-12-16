# API Testing Guide

This guide shows how to test the BracketBus API endpoints using curl or Postman.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header.

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "admin"
  }
}
```

Save the `access_token` for subsequent requests.

## Using the Token

Include the token in the Authorization header:

```bash
curl -X GET http://localhost:3000/api/brackets \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Example Requests

### Get Current User

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get All Brackets

```bash
curl -X GET http://localhost:3000/api/brackets \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Pool

```bash
curl -X POST http://localhost:3000/api/pools \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Pool",
    "tournamentId": "TOURNAMENT_ID"
  }'
```

### Get All Games

```bash
curl -X GET http://localhost:3000/api/games
```

### Get All Teams

```bash
curl -X GET http://localhost:3000/api/teams
```

### Create Bracket

```bash
curl -X POST http://localhost:3000/api/brackets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Bracket",
    "poolId": "POOL_ID",
    "picks": [
      {
        "gameId": "GAME_ID_1",
        "predictedWinnerId": "TEAM_ID_1"
      },
      {
        "gameId": "GAME_ID_2",
        "predictedWinnerId": "TEAM_ID_2"
      }
    ]
  }'
```

## Postman Setup

1. Create a new collection
2. Add environment variable `base_url` = `http://localhost:3000/api`
3. Add environment variable `token` = (from login response)
4. Create a pre-request script to add token:

```javascript
pm.request.headers.add({
  key: 'Authorization',
  value: 'Bearer ' + pm.environment.get('token')
});
```

## Testing Public Endpoints

Some endpoints don't require authentication:

```bash
# Get public pool view
curl -X GET http://localhost:3000/api/pools/POOL_ID/public

# Get all teams
curl -X GET http://localhost:3000/api/teams

# Get all games
curl -X GET http://localhost:3000/api/games
```

