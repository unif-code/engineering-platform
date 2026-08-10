import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandMark } from '.';

describe('BrandMark', () => {
  it('展开和折叠时都保留产品可访问名', () => {
    const { rerender } = render(<BrandMark />);

    expect(
      screen.getByRole('img', { name: '内部研发平台' }),
    ).toBeInTheDocument();
    expect(screen.getByText('IP')).toBeInTheDocument();
    expect(screen.getByText('内部研发平台')).toBeInTheDocument();

    rerender(<BrandMark collapsed />);

    expect(
      screen.getByRole('img', { name: '内部研发平台' }),
    ).toBeInTheDocument();
    expect(screen.getByText('IP')).toBeInTheDocument();
    expect(screen.queryByText('内部研发平台')).not.toBeInTheDocument();
  });
});
