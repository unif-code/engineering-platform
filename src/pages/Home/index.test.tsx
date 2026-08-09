import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './index';

describe('HomePage', () => {
  it('renders the platform skeleton message', () => {
    render(<HomePage />);
    expect(screen.getByText(/内部研发平台/)).toBeInTheDocument();
  });
});
