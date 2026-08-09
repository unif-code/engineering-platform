import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdminPage from './index';

describe('AdminPage', () => {
  it('renders the admin skeleton message', () => {
    render(<AdminPage />);
    expect(screen.getByText(/管理后台/)).toBeInTheDocument();
  });
});
