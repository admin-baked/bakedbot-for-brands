import Cookies from 'universal-cookie';
import { StateStorage } from 'zustand/middleware';

const cookies = new Cookies();

export const cookieStorage: StateStorage = {
  getItem: (name: string): string | null => {
    return cookies.get(name) || null;
  },
  setItem: (name: string, value: string): void => {
    cookies.set(name, value, { path: '/' });
  },
  removeItem: (name: string): void => {
    cookies.remove(name, { path: '/' });
  },
};
