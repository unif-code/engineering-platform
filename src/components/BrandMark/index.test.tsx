import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandMark } from '.';

describe('BrandMark', () => {
  it('展开和折叠时使用原型 4b 面罩标识与统一产品名', () => {
    const { rerender } = render(<BrandMark />);
    const brand = screen.getByRole('img', { name: '研发协作平台' });
    const mark = brand.querySelector('svg');

    expect(brand).toBeInTheDocument();
    expect(mark).toHaveAttribute('viewBox', '0 0 48 48');
    expect(mark?.querySelector('path')).toHaveAttribute(
      'd',
      'M16,10 h16 a10,10 0 0 1 10,10 v8 a10,10 0 0 1 -10,10 h-16 a10,10 0 0 1 -10,-10 v-8 a10,10 0 0 1 10,-10 Z M16,20 h16 a4,4 0 0 1 0,8 h-16 a4,4 0 0 1 0,-8 Z M27.8,24 a2.2,2.2 0 1 0 4.4,0 a2.2,2.2 0 1 0 -4.4,0 Z',
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
