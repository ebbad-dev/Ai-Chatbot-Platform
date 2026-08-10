import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

describe('Dashboard AI Knowledge Staff Portal', () => {
  it('renders brand heading and unanswered review queue by default', async () => {
    render(<App />);
    expect(screen.getByText(/PrintEZ AI Staff/i)).toBeDefined();
    expect(screen.getByText(/Unanswered Questions Queue/i)).toBeDefined();
    
    await waitFor(() => {
      expect(screen.getByText(/Pending Staff Reviews/i)).toBeDefined();
      expect(screen.getByText(/Do you offer rush overnight delivery on holographic UV stickers to Toronto\?/i)).toBeDefined();
    });
  });
});
