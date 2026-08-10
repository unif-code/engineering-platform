import { BrandMark } from '@/components/BrandMark';

export interface MenuBrandProps {
  collapsed?: boolean;
}

export function MenuBrand({ collapsed }: MenuBrandProps) {
  return <BrandMark collapsed={collapsed} />;
}
