import { describe, it, expect } from 'vitest'
import { render, screen } from '../test-utils'
import HomePage from '../pages/HomePage'

describe('HomePage', () => {
  it('renders the site title', () => {
    render(<HomePage />)
    expect(screen.getByText('BracketBus')).toBeInTheDocument()
  })

  it('renders the login link', () => {
    render(<HomePage />)
    const loginLink = screen.getByRole('link', { name: /login/i })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  it('renders the description', () => {
    render(<HomePage />)
    expect(
      screen.getByText(/BracketBus is a tournament bracket management platform/i)
    ).toBeInTheDocument()
  })

  it('renders instructions for viewing tournaments', () => {
    render(<HomePage />)
    expect(screen.getByText(/Viewing Tournaments and Brackets/i)).toBeInTheDocument()
  })

  it('renders instructions for viewing public pools', () => {
    render(<HomePage />)
    expect(screen.getByText(/Viewing Public Pool Pages/i)).toBeInTheDocument()
  })
})
