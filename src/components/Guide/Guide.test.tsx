import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Guide from './Guide';

describe('Guide', () => {
  it('renders welcome text with the given name', () => {
    render(<Guide name="@umijs/max" />);
    expect(screen.getByText(/欢迎使用/)).toBeInTheDocument();
    expect(screen.getByText('@umijs/max')).toBeInTheDocument();
  });
});
