import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandMark } from '.';

describe('BrandMark', () => {
  it('展开和折叠时使用统一产品名且不渲染旧字母标识', () => {
    const { rerender } = render(<BrandMark />);

    expect(
      screen.getByRole('img', { name: '研发协作平台' }),
    ).toBeInTheDocument();
    expect(screen.getByText('研发协作平台')).toBeInTheDocument();
    expect(screen.queryByText('IP')).not.toBeInTheDocument();

    rerender(<BrandMark collapsed />);

    expect(
      screen.getByRole('img', { name: '研发协作平台' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('研发协作平台')).not.toBeInTheDocument();
    expect(screen.queryByText('IP')).not.toBeInTheDocument();
  });
});
