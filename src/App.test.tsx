import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

describe('DevAid AI debugging workspace', () => {
  afterEach(() => vi.restoreAllMocks());

  it('prevents an empty submission and explains what is missing', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Your code'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /analyze error/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('Add both the code and the error message');
  });

  it('renders a validated response and supports copying corrected code', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      error_type: 'ReferenceError',
      explanation: 'A variable is used before it exists.',
      probable_cause: 'The greeting value was not declared.',
      suggested_correction: 'Define the value before calling the function.',
      corrected_code: 'const hello = "Hello";',
      verification_steps: ['Run the script again.'],
      warnings: ['Review the change before shipping.'],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /analyze error/i }));

    expect(await screen.findByRole('heading', { name: 'Here’s what we found.' })).toBeInTheDocument();
    expect(screen.getByText('ReferenceError')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('const hello = "Hello";'));
  });

  it('shows a useful message when the API is unavailable', async () => {
    vi.spyOn(window, 'fetch').mockRejectedValue(new Error('Unable to reach the debugging service.'));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /analyze error/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the debugging service.');
  });
});
