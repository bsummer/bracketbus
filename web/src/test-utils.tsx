import React, { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <AuthProvider>{children}</AuthProvider>
    </BrowserRouter>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string
  wrapper?: React.ComponentType<{ children: React.ReactNode }>
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions,
) => {
  const { initialRoute, wrapper, ...renderOptions } = options || {}
  
  // Set initial route if provided
  if (initialRoute && typeof window !== 'undefined') {
    window.history.pushState({}, 'Test page', initialRoute)
  }
  
  // Use provided wrapper or default AllTheProviders
  const Wrapper = wrapper || AllTheProviders
  
  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'

// Export custom render as default render
export { customRender as render }

// Export userEvent for convenience
export { userEvent }

// Export the default wrapper for use in tests if needed
export { AllTheProviders }

