import { useEffect, useMemo } from 'react';
import { useAuth } from '../auth/context';
import { useClient } from '../data/queries';
import { ThemeContext } from './context';

const DEFAULT_BRAND = { primary: '#007AE3', name: 'Torem AI', logoUrl: '' };

function hoverFor(hex) {
  return `color-mix(in srgb, ${hex} 88%, white)`;
}

export function ThemeProvider({ children }) {
  const { activeClientId } = useAuth();
  const { data } = useClient(activeClientId);

  const brand = useMemo(() => {
    if (!data?.client) return DEFAULT_BRAND;
    return {
      primary: data.config?.primary_color || DEFAULT_BRAND.primary,
      name: data.client.business_name,
      logoUrl: data.config?.logo_url || '',
    };
  }, [data]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand', brand.primary);
    root.style.setProperty('--brand-hover', hoverFor(brand.primary));
    document.title = `${brand.name} · Dashboard`;
  }, [brand]);

  const value = useMemo(
    () => ({ brand, client: data?.client ?? null, config: data?.config ?? null, addons: data?.addons ?? [] }),
    [brand, data]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
