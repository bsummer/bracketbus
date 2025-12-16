# Web Frontend Development Plan

## Overview
Build a React-based web application that provides the same functionality as the mobile app, with a focus on bracket visualization and management. The web frontend will share the same backend API as the mobile app.

## Project Structure

```
brackets-draft1/
├── backend/          # NestJS backend API (shared)
├── frontend/         # React Native Expo app (mobile)
├── web/              # React web application (NEW)
│   ├── public/
│   ├── src/
│   │   ├── api/      # API client (similar to mobile)
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/  # Auth context
│   │   ├── hooks/
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
└── design-images/
    └── full-brackets.png  # Reference design for bracket display
```

## Tech Stack

### Core Technologies
- **React 18+** - UI library
- **TypeScript** - Type safety
- **React Router v6** - Client-side routing
- **Axios** - HTTP client for API calls
- **React Context API** - State management (auth, global state)
- **CSS Modules or Styled Components** - Component styling

### Build Tools
- **Vite** or **Create React App** - Build tooling and dev server
- **ESLint** - Code linting
- **Prettier** - Code formatting

### UI/UX Libraries (Optional)
- **React Query (TanStack Query)** - Server state management and caching
- **React Hook Form** - Form handling
- **Zod** or **Yup** - Form validation
- **Tailwind CSS** or **Material-UI** - Styling framework (optional)

## Functional Requirements

### 1. Authentication
- ✅ Login screen with username/password
- ✅ JWT token management (localStorage)
- ✅ Protected routes (redirect to login if not authenticated)
- ✅ Logout functionality
- ✅ Auto-logout on token expiration
- ✅ Persistent login (token stored in localStorage)
- ✅ The public pool display page route doesn't require authentication
- ✅ When unauthenticated, the pool display page should not show navigation buttons to other pages
- ✅ Public pool display page shows pool information, leaderboard, and member list (read-only)
- ✅ When authenticated, users see full pool detail page with all features

### 2. Dashboard/Home Screen
- ✅ Display list of user's brackets
- ✅ Display list of user's pools
- ✅ Quick actions: Create Bracket, Create Pool
- ✅ Bracket status indicators (Editable/Locked)
- ✅ Navigation to bracket details, pool details
- Show brackets grouped by pool (optional enhancement)

### 3. Bracket Management

#### 3.1 Bracket List View
- ✅ List all user's brackets
- ✅ Show bracket name, associated pool name, creation date, lock status
- ✅ Actions: View, Edit (if unlocked), Delete
- Filter/Sort options (optional)
- ✅ Display which pool each bracket belongs to

#### 3.2 Create/Edit Bracket
- ✅ Form to enter bracket name
- ✅ **Pool selection required**: User must select a pool before creating a bracket
- ✅ **Pool membership validation**: User must be a member of the selected pool to create a bracket
- ✅ **One bracket per pool**: User can only create one bracket per pool they are in
- ✅ Game selection interface (similar to mobile)
- ✅ Display games organized by round
- ✅ Team selection for each game
- ✅ Visual feedback for selected teams
- ✅ Save button (creates or updates bracket)
- ✅ Validation: require bracket name, pool selection, all games selected
- ✅ Lock check: prevent editing if bracket is locked or first game has started

#### 3.3 Bracket Detail/Display View
- ✅ Full bracket visualization (based on design-images/full-brackets.png)
- ✅ Display associated pool name and information
- ✅ Display all rounds in tournament bracket format
- ✅ Show selected teams for each game
- ✅ Show actual winners (if game completed)
- ✅ Show points earned per pick
- ✅ Show total score
- ✅ Visual indicators: correct picks (green), incorrect picks (red)
- ✅ Read-only view for locked brackets
- ✅ Delete button (only for unlocked brackets)

#### 3.4 Bracket Visualization Design
Based on `design-images/full-brackets.png`:
- Tournament bracket tree structure
- Left-to-right flow: Round 1 → Round 2 → ... → Final
- Each game displayed as a card/box
- Team names with seeds (e.g., "Team Name (1)")
- Lines connecting games between rounds
- Color coding for picks vs. actual results
- Responsive layout (works on desktop and tablet)

### 4. Pool Management

#### 4.1 Pool List View
- ✅ List all user's pools
- ✅ Show pool name, member count, invite code
- ✅ Actions: View Details, Join Pool (via invite code)

#### 4.2 Create Pool
- ✅ Form to enter pool name
- ✅ **Tournament selection required**: User must select a tournament to associate the pool with
- ✅ Display generated invite code
- Copy invite code to clipboard
- ✅ Success message after creation
- ✅ Note: A user can create multiple pools per tournament

#### 4.3 Join Pool
- ✅ Modal/form to enter invite code
- ✅ Validation for invite code format (8 digit alpha-numeric string)
- ✅ Error handling for invalid codes
- ✅ Success message after joining

#### 4.4 Pool Detail View (Authenticated)
- ✅ Pool name and invite code
- ✅ Tournament information (name, start date)
- ✅ Member list
- ✅ **Member management (admin/creator only)**:
  - ✅ Add existing users to pool (by username or user ID)
  - ✅ Kick members from pool
  - ✅ UI controls only visible to pool creator or admins
- ✅ Leaderboard (top brackets in pool)
- Link to full leaderboard page
- ✅ Display each member with their associated bracket (one bracket per member per pool)

#### 4.5 Public Pool Display Page
- ✅ **No authentication required**: This is the only page accessible without login
- ✅ Shows pool information (name, tournament, member count)
- ✅ Displays leaderboard with top brackets
- ✅ Shows member list (usernames only, no sensitive information)
- ✅ **No navigation buttons when unauthenticated**: Page should not show links to other pages (dashboard, create bracket, etc.)
- ✅ **Conditional UI**: If user is authenticated, show full navigation and additional features
- ✅ Accessible via public route: `/pools/:id/public` or similar
- ✅ Read-only view: No ability to join, create brackets, or manage members when unauthenticated

### 5. Delete Functionality
- ✅ Delete bracket confirmation dialog
- ✅ Only allow deletion of unlocked brackets
- ✅ Refresh bracket list after deletion
- ✅ Success/error feedback

## Technical Implementation Details

### API Integration

#### API Client Setup
Create `web/src/api/client.ts` similar to mobile:
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
});

// Request interceptor: Add JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

#### API Modules
Reuse same structure as mobile:
- `web/src/api/auth.ts` - Authentication endpoints
- `web/src/api/brackets.ts` - Bracket CRUD operations
- `web/src/api/pools.ts` - Pool operations
- `web/src/api/games.ts` - Game data
- `web/src/api/teams.ts` - Team data

### Authentication Context
Create `web/src/context/AuthContext.tsx`:
- Manage authentication state
- Provide login/logout functions
- Check authentication status
- Protect routes

### Routing Structure
```
/                    → Redirect to /dashboard or /login
/login               → Login page (public)
/dashboard           → Main dashboard (brackets + pools list) - protected
/brackets            → Bracket list view - protected
/brackets/new        → Create bracket - protected
/brackets/:id        → Bracket detail/view - protected
/brackets/:id/edit   → Edit bracket (if unlocked) - protected
/pools               → Pool list view - protected
/pools/new           → Create pool - protected
/pools/:id           → Pool detail view (authenticated) - protected
/pools/:id/public    → Public pool display page (no authentication required)
```

**Route Protection Notes:**
- All routes except `/login` and `/pools/:id/public` require authentication
- Public pool display page (`/pools/:id/public`) shows read-only pool information
- When unauthenticated users visit `/pools/:id/public`, no navigation buttons to other pages are shown
- Authenticated users visiting `/pools/:id/public` can see full navigation and may be redirected to `/pools/:id` for full features

### Bracket Visualization Component

#### Component Structure
```
BracketView/
├── BracketView.tsx          # Main container
├── BracketRound.tsx         # Single round column
├── BracketGame.tsx          # Single game box
├── TeamDisplay.tsx          # Team name with seed
└── BracketConnector.tsx     # Lines between rounds
```

#### Key Features
- Responsive grid layout
- CSS for bracket tree visualization
- Conditional styling based on:
  - Selected team (highlighted)
  - Correct/incorrect picks (color coding)
  - Game completion status
- Smooth animations (optional)

#### Data Structure for Rendering
Transform bracket picks into round-based structure:
```typescript
interface BracketRound {
  round: number;
  games: Array<{
    gameId: string;
    gameNumber: number;
    team1: Team;
    team2: Team;
    selectedTeam: Team | null;
    actualWinner: Team | null;
    isCorrect: boolean;
    pointsEarned: number;
  }>;
}
```

### Bracket Locking Logic

#### Check if Bracket is Editable
```typescript
const isBracketEditable = (bracket: Bracket): boolean => {
  // Check if bracket is locked
  if (bracket.lockedAt) return false;
  
  // Check if first game has started
  const firstGame = getFirstGame(bracket.picks);
  if (firstGame?.game.status === 'in_progress' || firstGame?.game.status === 'completed') {
    return false;
  }
  
  return true;
};
```

#### UI Behavior
- Disable edit button if bracket is not editable
- Show lock icon/indicator
- Display message: "Bracket is locked" or "Tournament has started"
- Hide delete button for locked brackets

## Development Phases

### Phase 1: Project Setup & Authentication (Week 1)
1. Initialize React project (Vite or CRA)
2. Set up TypeScript configuration
3. Install dependencies (React Router, Axios, etc.)
4. Create project structure
5. Set up API client
6. Implement AuthContext
7. Create Login page
8. Implement protected routes
9. Test authentication flow

**Deliverables:**
- Working login/logout
- Protected route system
- API client configured

### Phase 2: Dashboard & Bracket List (Week 1-2)
1. Create Dashboard layout
2. Implement bracket list component
3. Implement pool list component
4. Add navigation between pages
5. Create bracket card component (showing associated pool)
6. Add delete bracket functionality
7. Test bracket CRUD operations

**Deliverables:**
- Dashboard showing brackets and pools
- Bracket list with delete functionality and pool association display
- Navigation working

### Phase 3: Bracket Creation & Editing (Week 2)
1. Create bracket form component
2. **Add pool selection step**: User must select a pool before creating bracket
3. **Add pool membership validation**: Verify user is member of selected pool
4. **Add one-bracket-per-pool validation**: Prevent creating multiple brackets in same pool
5. Implement game selection interface
6. Add team selection for each game
7. Implement save/create functionality
8. Implement edit functionality (load existing picks)
9. Add validation (bracket name, pool selection, all games selected)
10. Add lock checking logic
11. Test create/edit flows

**Deliverables:**
- Create bracket page with pool selection
- Edit bracket page
- Lock checking working
- Pool association validation

### Phase 4: Bracket Visualization (Week 3)
1. Design bracket tree layout (CSS/Grid)
2. Create BracketView component
3. Implement round-by-round display
4. Add team display with seeds
5. Implement connector lines between rounds
6. Add color coding for picks/results
7. Make responsive
8. Test with various bracket sizes

**Deliverables:**
- Full bracket visualization matching design
- Responsive layout
- Visual indicators working

### Phase 5: Pool Management (Week 3-4)
1. Create pool list page
2. Implement create pool form (with tournament selection)
3. Implement join pool modal
4. Create pool detail page (authenticated view)
5. **Add member management features** (add/kick members for admins/creators)
6. **Create public pool display page** (no authentication required)
7. Add leaderboard display
8. Test pool operations

**Deliverables:**
- Pool CRUD operations
- Join pool functionality
- Pool detail page (authenticated)
- Public pool display page
- Member management for admins/creators

### Phase 6: Polish & Testing (Week 4)
1. Add loading states
2. Add error handling
3. Add success/error messages
4. Improve responsive design
5. Add loading skeletons
6. Test all user flows
7. Fix bugs
8. Performance optimization

**Deliverables:**
- Polished UI/UX
- Error handling throughout
- Tested application

## Component Structure

```
web/src/
├── api/
│   ├── client.ts
│   ├── auth.ts
│   ├── brackets.ts
│   ├── pools.ts
│   ├── games.ts
│   └── teams.ts
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorMessage.tsx
│   ├── bracket/
│   │   ├── BracketCard.tsx
│   │   ├── BracketView.tsx
│   │   ├── BracketRound.tsx
│   │   ├── BracketGame.tsx
│   │   └── TeamDisplay.tsx
│   └── pool/
│       ├── PoolCard.tsx
│       └── PoolDetail.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── BracketListPage.tsx
│   ├── CreateBracketPage.tsx
│   ├── EditBracketPage.tsx
│   ├── BracketDetailPage.tsx
│   ├── PoolListPage.tsx
│   ├── CreatePoolPage.tsx
│   ├── PoolDetailPage.tsx
│   └── PublicPoolPage.tsx
├── context/
│   └── AuthContext.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useBrackets.ts
│   └── usePools.ts
├── utils/
│   ├── bracketUtils.ts
│   ├── dateUtils.ts
│   └── validation.ts
└── App.tsx
```

## Styling Approach

### Option 1: CSS Modules
- Component-scoped styles
- Type-safe class names
- No external dependencies

### Option 2: Tailwind CSS
- Utility-first CSS
- Fast development
- Consistent design system

### Option 3: Styled Components
- CSS-in-JS
- Dynamic styling
- Theme support

**Recommendation:** Start with CSS Modules for simplicity, consider Tailwind if rapid UI development is needed.

## Environment Configuration

### Environment Variables
Create `.env` file:
```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_ENV=development
```

### Build Configuration
- Development: `npm run dev` (Vite) or `npm start` (CRA)
- Production: `npm run build`
- Output: `dist/` or `build/` directory

## Testing Strategy

### Unit Tests
- Component rendering tests
- Utility function tests
- API client tests (mocked)

### Integration Tests
- Authentication flow
- Bracket CRUD operations
- Pool operations

### E2E Tests (Optional)
- Full user workflows
- Cross-browser testing

## Deployment Considerations

### Build Output
- Static files (HTML, CSS, JS)
- Can be served from any static host

### Deployment Options
- **Netlify** - Easy deployment, free tier
- **Vercel** - Great for React apps
- **GitHub Pages** - Free hosting
- **AWS S3 + CloudFront** - Scalable option

### CORS Configuration
Ensure backend CORS allows web frontend origin:
```typescript
// backend/src/main.ts
app.enableCors({
  origin: ['http://localhost:5173', 'https://your-web-domain.com'],
  credentials: true,
});
```

## Design Reference

### Bracket Visualization
Reference: `design-images/full-brackets.png`

Key design elements to implement:
- Tournament bracket tree structure
- Round-by-round progression
- Team names with seeds
- Visual connection between games
- Color coding for results
- Responsive layout

## Success Criteria

User can log in and log out
User can view all their brackets
User can create new brackets
User can edit unlocked brackets
User can delete unlocked brackets
User can view full bracket visualization
User can view all their pools
User can create new pools (with tournament selection)
User can join pools via invite code
User can only create one bracket per pool
Brackets must be associated with a pool
Pool creator/admin can add and kick members
Public pool display page accessible without authentication
Bracket editing is disabled after first game starts
Bracket visualization matches design reference
Application is responsive and works on desktop/tablet
Error handling is comprehensive
Loading states are shown appropriately

## Future Enhancements

- Real-time updates (WebSockets)
- Bracket comparison view
- Export bracket as image/PDF
- Print-friendly bracket view
- Dark mode
- Keyboard shortcuts
- Drag-and-drop bracket editing
- Bracket templates
- Advanced filtering and sorting

