import React from 'react';
import { axe } from 'jest-axe';
import Home from '../components/pages/Home';
import { renderWithProviders } from '../test-utils';

// jest-axe matchers available

describe('Accessibility - Home screen', () => {
  it('should have no detectable a11y violations', async () => {
    const { container } = renderWithProviders(<Home onLogout={() => {}} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
}); 