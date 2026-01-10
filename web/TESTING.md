# Frontend Testing Guide

This project uses [Vitest](https://vitest.dev/) for unit testing and [React Testing Library](https://testing-library.com/react) for component testing.

## Setup

Vitest is configured in `vite.config.ts` and works seamlessly with Vite. No additional configuration is needed for:
- TypeScript support
- ESM modules
- `import.meta.env` (native Vite support)
- CSS imports
- React components

## Running Tests

```bash
# Run tests in watch mode (default)
npm test

# Run tests with UI
npm run test:ui

# Run tests once (for CI)
npm run test:run

# Run tests with coverage
npm run test:coverage
```

## Writing Tests

### Basic Test Structure

Tests should be placed in `src/__tests__/` or co-located with components using `.test.ts` or `.spec.ts` extensions.

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '../test-utils'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### Custom Render Function

Use the custom `render` function from `test-utils.tsx` which includes:
- `BrowserRouter` for routing
- `AuthProvider` for authentication context
- All React Testing Library utilities

```typescript
import { render, screen, userEvent } from '../test-utils'

it('handles user interaction', async () => {
  const user = userEvent.setup()
  render(<MyComponent />)
  
  const button = screen.getByRole('button', { name: /click me/i })
  await user.click(button)
  
  expect(screen.getByText('Clicked!')).toBeInTheDocument()
})
```

## Test Utilities

The `src/test-utils.tsx` file provides:
- `render()` - Custom render with all providers
- `screen` - All queries from React Testing Library
- `userEvent` - User interaction utilities

## Mocking

### API Client

The API client (`src/api/client.ts`) uses `import.meta.env` which works natively in Vitest. No special mocking is needed unless you want to mock specific API calls.

### Local Storage

Vitest provides a jsdom environment that includes `localStorage` by default. You can use it directly in tests:

```typescript
it('reads from localStorage', () => {
  localStorage.setItem('key', 'value')
  render(<Component />)
  // Your test
  localStorage.clear() // Clean up
})
```

## Coverage

Coverage reports are generated using Vitest's built-in coverage provider (`@vitest/coverage-v8`). Reports are generated in:
- `coverage/` directory
- HTML report: `coverage/index.html`
- Text summary in terminal

## Best Practices

1. **Test user behavior, not implementation**: Use queries that mirror user interactions (`getByRole`, `getByText`, etc.)
2. **Keep tests simple**: One assertion per test when possible
3. **Use descriptive test names**: "should display error message when login fails" is better than "test login"
4. **Clean up**: The setup file automatically cleans up after each test
5. **Mock external dependencies**: Use `vi.mock()` to mock API calls and external modules

## Example Tests

See:
- `src/__tests__/App.test.tsx` - Basic component rendering
- `src/__tests__/HomePage.test.tsx` - Component with routing and user interactions

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library Documentation](https://testing-library.com/react)
- [Vitest UI](https://vitest.dev/guide/ui.html)
