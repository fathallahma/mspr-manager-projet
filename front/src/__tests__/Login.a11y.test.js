import React from 'react';
import { axe } from 'jest-axe';
import Login from '../components/authentification/Login';
import { renderWithProviders } from '../test-utils';

// jest-axe matchers already available

describe('Accessibility - Login screen', () => {
  it('should have no detectable a11y violations', async () => {
    const { container } = renderWithProviders(<Login onLogin={() => {}} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
}); 