import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  businessId: string;
  businessName: string;
  locationIds: string[];
}

interface Location {
  id: string;
  name: string;
  slug: string;
}

interface AppState {
  user: User | null;
  locations: Location[];
  activeLocationId: string | null;
  setUser: (user: User | null) => void;
  setLocations: (locations: Location[]) => void;
  setActiveLocationId: (id: string) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  locations: [],
  activeLocationId: null,
  setUser: (user) => set({ user }),
  setLocations: (locations) => set({ locations }),
  setActiveLocationId: (id) => set({ activeLocationId: id }),
  logout: () => {
    localStorage.removeItem('tsos_token');
    set({ user: null, locations: [], activeLocationId: null });
  },
}));
