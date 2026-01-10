import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App', () => {
  it('renders without crashing', () => {
    // App component already includes BrowserRouter and AuthProvider,
    // so we render it directly without additional wrapping
    render(<App />)
    expect(screen).toBeDefined()
  })
})
