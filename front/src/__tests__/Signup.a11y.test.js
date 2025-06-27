import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import Signup from '../components/authentification/Signup';

// "jest-axe/extend-expect" already imported globally in setupTests

describe('Accessibility - Signup screen', () => {
  it('should have no detectable a11y violations', async () => {
    const { container } = render(<Signup />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
}); 