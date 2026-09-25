import { createContext, useContext } from 'react';
import { useAuth } from '../auth/context';

export const ThemeContext = createContext(null);

export function useTheme() {
  return useContext(ThemeContext);
}

export function useAddons() {
  const { addons } = useTheme();
  const { isAdmin, activeClientId } = useAuth();
  const enabled = (name) => (isAdmin && !activeClientId ? true : addons.some((a) => a.addon_name === name && a.enabled));
  return { addons, enabled };
}
