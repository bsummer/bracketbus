# Deploying BracketBus Backend to Render (Free Tier)

This guide will help you deploy the NestJS backend service to Render's free tier so you can collaborate with others.

## Prerequisites

- A Render account (sign up at [render.com](https://render.com))
- Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
- Basic understanding of environment variables

## Step 1: Create PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"PostgreSQL"**
3. Configure the database:
   - **Name**: `bracketbus-db` (or your preferred name)
   - **Database**: `bracketbus`
   - **User**: Auto-generated (you can customize)
   - **Region**: Choose the region closest to you
   - **PostgreSQL Version**: 14 or higher
   - **Plan**: **Free**
4. Click **"Create Database"**
5. Wait for provisioning (1-2 minutes)
6. **Important**: Copy the **Internal Database URL** - you'll need this for the backend service

### Understanding the Database URL

The Internal Database URL looks like:
```
postgresql://user:password@hostname:5432/bracketbus
```

You'll need to extract these values:
- `DB_HOST` = `hostname`
- `DB_PORT` = `5432`
- `DB_USERNAME` = `user`
- `DB_PASSWORD` = `password`
- `DB_DATABASE` = `bracketbus`

## Step 2: Create Backend Web Service

1. In Render Dashboard, click **"New +"** → **"Web Service"**
2. Connect your Git repository (GitHub/GitLab/Bitbucket)
3. Configure the service:

### Basic Settings

- **Name**: `bracketbus-backend`
- **Environment**: `Node`
- **Region**: Same region as your database (for better performance)
- **Branch**: `main` (or your default branch)
- **Root Directory**: `backend`

### Build & Deploy Settings

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:prod`

### Environment Variables

Add the following environment variables in the Render dashboard:

```
NODE_ENV=production
PORT=10000
DB_HOST=<hostname from Internal Database URL>
DB_PORT=5432
DB_USERNAME=<username from Internal Database URL>
DB_PASSWORD=<password from Internal Database URL>
DB_DATABASE=bracketbus
JWT_SECRET=<generate a strong random string - use: openssl rand -base64 32>
JWT_EXPIRES_IN=24h
```

**Important Notes:**
- Use the **Internal Database URL** values, not the External URL
- Generate a strong `JWT_SECRET` (you can use: `openssl rand -base64 32` in your terminal)
- The `PORT` variable is set automatically by Render, but including it doesn't hurt

4. Click **"Create Web Service"**

## Step 3: Update CORS Configuration

Update `backend/src/main.ts` to allow your Render frontend URL (if deploying frontend):

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:19006',
      process.env.FRONTEND_URL, // Add your Render frontend URL here
    ].filter(Boolean),
    credentials: true,
  });

  // ... rest of the code
}
```

## Step 4: Run Database Migrations & Seed Data

After the first deployment, you need to set up your database schema and seed initial data.

### Option A: Using Render Shell (Recommended for Free Tier)

1. Go to your web service in Render Dashboard
2. Click on **"Shell"** tab
3. Run the following commands:

```bash
cd backend
npm run migration:run
npm run seed
```

### Option B: Add Deployment Script

Create `backend/scripts/deploy.ts`:

```typescript
import { AppDataSource } from '../src/data-source';

async function deploy() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');
    
    // Run migrations
    await AppDataSource.runMigrations();
    console.log('Migrations completed');
    
    // Seed database
    const { seedDatabase } = require('../src/database/seeds/seed');
    await seedDatabase(AppDataSource);
    console.log('Database seeded');
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

deploy();
```

Add to `backend/package.json`:

```json
"scripts": {
  "deploy": "ts-node -r tsconfig-paths/register scripts/deploy.ts"
}
```

Then run via Render Shell: `npm run deploy`

## Step 5: Update Frontend API URL

If you're deploying the frontend, update your frontend environment variables:

```
VITE_API_URL=https://bracketbus-backend.onrender.com/api
```

Replace `bracketbus-backend` with your actual Render service name.

## Step 6: Verify Deployment

1. Check the **"Logs"** tab in Render dashboard for any errors
2. Test your API endpoint: `https://your-service-name.onrender.com/api`
3. You should see a response (or 404 for root, which is expected)

## Important Notes for Free Tier

### Limitations

1. **Spinning Down**: Free tier services automatically spin down after 15 minutes of inactivity. The first request after spin-down takes ~30 seconds to wake up the service.

2. **Database Limits**: 
   - Free PostgreSQL databases have 90-day retention
   - 1GB storage limit
   - No automatic backups (manual backups available)

3. **Build Time**: Free tier has limited build minutes per month (750 minutes)

4. **HTTPS**: Render provides HTTPS automatically for all services

5. **Environment Variables**: Always set sensitive values (like `JWT_SECRET`) in the Render dashboard, never commit them to your repository

### Best Practices

- Use Internal Database URL for backend services (faster, more secure)
- Use External Database URL only for local development
- Monitor your usage in the Render dashboard
- Set up email notifications for service issues
- Use strong, randomly generated secrets for production

## Troubleshooting

### Build Fails

- Check build logs in Render dashboard for specific errors
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### Database Connection Errors

- Verify you're using the **Internal Database URL** (not External)
- Check that all environment variables are set correctly
- Ensure database is fully provisioned (check status in dashboard)

### CORS Errors

- Update CORS origins in `backend/src/main.ts` to include your frontend URL
- Ensure `credentials: true` is set if using cookies/auth headers

### Port Issues

- Render automatically sets the `PORT` environment variable
- Your code should use `process.env.PORT || 3000` (which it already does)

### Service Won't Start

- Check logs for specific error messages
- Verify `start:prod` script works locally: `npm run build && npm run start:prod`
- Ensure all required environment variables are set

## Optional: Using render.yaml

For easier setup and version control, you can create a `render.yaml` file in your repository root:

```yaml
services:
  - type: web
    name: bracketbus-backend
    env: node
    rootDir: backend
    buildCommand: npm install && npm run build
    startCommand: npm run start:prod
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: DB_HOST
        fromDatabase:
          name: bracketbus-db
          property: host
      - key: DB_PORT
        fromDatabase:
          name: bracketbus-db
          property: port
      - key: DB_USERNAME
        fromDatabase:
          name: bracketbus-db
          property: user
      - key: DB_PASSWORD
        fromDatabase:
          name: bracketbus-db
          property: password
      - key: DB_DATABASE
        fromDatabase:
          name: bracketbus-db
          property: database
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_EXPIRES_IN
        value: 24h

databases:
  - name: bracketbus-db
    databaseName: bracketbus
    plan: free
```

When you connect your repository, Render will automatically detect and use this configuration.

## Next Steps

After successful deployment:

1. Test all API endpoints
2. Set up your frontend to point to the Render backend
3. Share the backend URL with your collaborator
4. Consider setting up a custom domain (optional, requires paid plan)
5. Monitor logs and performance in the Render dashboard

## Getting Help

- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com/)
- Check service logs in Render dashboard for detailed error messages

