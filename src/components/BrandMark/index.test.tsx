import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandMark } from '.';

describe('BrandMark', () => {
  it('展开和折叠时使用统一产品名且不渲染旧字母标识', () => {
    const { rerender } = render(<BrandMark />);
    const brand = screen.getByRole('img', { name: '研发协作平台' });

    expect(brand).toBeInTheDocument();
    expect(brand.firstElementChild).toHaveStyle({
      height: '26px',
      width: '26px',
    });
    expect(screen.getByText('研发协作平台')).toBeInTheDocument();
    expect(screen.queryByText('IP')).not.toBeInTheDocument();

    rerender(<BrandMark collapsed size="small" />);

    const compactBrand = screen.getByRole('img', { name: '研发协作平台' });
    expect(compactBrand).toBeInTheDocument();
    expect(compactBrand.firstElementChild).toHaveStyle({
      height: '24px',
      width: '24px',
    });
    expect(screen.queryByText('研发协作平台')).not.toBeInTheDocument();
    expect(screen.queryByText('IP')).not.toBeInTheDocument();
  });
});
