import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('PrintEZ Vibrant Tidio Specialist Widget App', () => {
  it('renders official PrintEZ SVG logo mark in rounded containers, greeting, and floating starter card on Home tab', () => {
    render(<App />);
    expect(screen.getByText(/AI chat powered by our custom print specialists/i)).toBeDefined();
    expect(screen.getByText(/Chat with PrintEZ Specialist/i)).toBeDefined();
    expect(screen.getByText(/^POWERED BY$/i)).toBeDefined();

    // Verify official SVG is loaded in logo containers
    const logos = screen.getAllByAltText(/PrintEZ/i);
    expect(logos.length).toBeGreaterThan(0);
    expect(logos[0].getAttribute('src')).toContain('Printez_Logo.svg');
  });

  it('verifies 3-dots More Options menu is present and opens expand/download dropdown on Home tab', () => {
    render(<App />);
    const moreBtn = screen.getByRole('button', { name: /More Options/i });
    fireEvent.click(moreBtn);

    expect(screen.getByText(/Expand window/i)).toBeDefined();
    expect(screen.getByText(/Download transcript/i)).toBeDefined();
  });

  it('navigates to Chat tab via pristine white navigation deck', () => {
    render(<App />);
    const chatTab = screen.getByRole('button', { name: /^Chat$/i });
    fireEvent.click(chatTab);

    expect(screen.getByText(/Messages & Thread History/i)).toBeDefined();
  });

  it('renders dedicated chat thread with official PrintEZ SVG avatar and interactive catalog scroll controls', async () => {
    render(<App />);
    const starterCard = screen.getByText(/Chat with PrintEZ Specialist/i);
    fireEvent.click(starterCard);

    // Verify green Lyro badge is completely removed and replaced with clean PrintEZ Specialist title
    expect(screen.queryByText(/^Lyro AI$/i)).toBeNull();
    expect(screen.getByText(/Online • Ready to assist/i)).toBeDefined();

    // Verify official SVG in chat thread avatar
    const avatars = screen.getAllByAltText(/PrintEZ/i);
    expect(avatars.length).toBeGreaterThan(0);

    // Verify 3-dots menu is present inside chat thread
    const moreBtn = screen.getByRole('button', { name: /More Options/i });
    fireEvent.click(moreBtn);
    expect(screen.getByText(/Download transcript/i)).toBeDefined();
    fireEvent.click(moreBtn);

    // Trigger product catalog to verify horizontal scroll buttons and visible scrollbar styling
    const input = screen.getByPlaceholderText(/Enter your message.../i) as HTMLInputElement;
    const sendBtn = screen.getByRole('button', { name: /Send Message/i });
    fireEvent.change(input, { target: { value: 'Show me your popular custom printing catalog items' } });
    fireEvent.click(sendBtn);

    // Wait for simulated bot reply containing product carousel
    const scrollLeftBtn = await screen.findByRole('button', { name: /Scroll Left/i }, { timeout: 1500 });
    const scrollRightBtn = screen.getByRole('button', { name: /Scroll Right/i });
    expect(scrollLeftBtn).toBeDefined();
    expect(scrollRightBtn).toBeDefined();

    // Test clicking horizontal scroll controls
    fireEvent.click(scrollRightBtn);
    fireEvent.click(scrollLeftBtn);

    // Verify Tidio outlined template chips appeared on initial welcome
    expect(screen.getByText(/Start custom print order/i)).toBeDefined();
  });
});
