import { mockApi } from './mock/api';
import { supabaseApi } from './supabaseApi';

export const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export const api = IS_MOCK ? mockApi : supabaseApi;
