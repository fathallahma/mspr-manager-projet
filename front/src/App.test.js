import { render } from '@testing-library/react';
import App from './App';

// Simple smoke test to ensure App renders without crashing
it('renders application root without crashing', () => {
  render(<App />);
});
