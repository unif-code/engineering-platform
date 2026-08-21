import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandMark } from '.';

describe('BrandMark', () => {
  it('展开和折叠时使用最终 D 形标识与统一产品名', () => {
    const { rerender } = render(<BrandMark />);
    const brand = screen.getByRole('img', { name: '研发协作平台' });
    const mark = brand.querySelector('svg');

    expect(brand).toBeInTheDocument();
    expect(mark).toHaveAttribute('viewBox', '0 0 48 48');
    expect(mark?.querySelector('path')).toHaveAttribute(
      'd',
      'M10 7h14c11 0 20 7.6 20 17s-9 17-20 17H10V7Zm9 9v16h5c5.9 0 10.5-3.6 10.5-8S29.9 16 24 16h-5Z',
    );
    expect(mark).toHaveStyle({
      height: '32px',
      width: '32px',
    });
    expect(screen.getByText('研发协作平台')).toBeInTheDocument();
    expect(screen.queryByText('IP')).not.toBeInTheDocument();

    rerender(<BrandMark collapsed size="small" />);

    const compactBrand = screen.getByRole('img', { name: '研发协作平台' });
    const compactMark = compactBrand.querySelector('svg');
    expect(compactBrand).toBeInTheDocument();
    expect(compactMark).toHaveAttribute('viewBox', '0 0 48 48');
    expect(compactMark).toHaveStyle({
      height: '24px',
      width: '24px',
    });
    expect(screen.queryByText('研发协作平台')).not.toBeInTheDocument();
    expect(screen.queryByText('IP')).not.toBeInTheDocument();
  });
});
