import { create } from 'zustand';

// --- DATA CONSTANTS (shared across the app) ---
export const AMENITIES = [
    'Supermarket', 'Restaurant', 'Membership Required',
    'Car Wash', 'ATM', 'Cash Discount',
    'Air Pump', 'Restrooms',
    'Oil', 
    'Full Service', 'Car Repairs',
    'Open 24/7',
    'Power',
];

export const PAYMENT_METHODS = ["Cash", "Transfer", "POS"]; 
export const ALL_PRODUCTS = ["Gas", "Petrol", "Kerosine", "Diesel"] as const; // Using 'as const' for stricter typing

// --- TYPE DEFINITIONS ---
type LocationFilter = { name: string; latitude: number; longitude: number };

// The fuelType is now correctly typed based on the ALL_PRODUCTS array
type SearchFilters = {
  priceRange: { min: string; max: string };
  fuelType: typeof ALL_PRODUCTS[number] | null; 
  sortBy: 'distance' | 'last_update';
  amenities: string[]; 
  rating: number; 
  requiredProducts: string[]; // This is now distinct from fuelType for price range
};

type FilterStoreState = {
  location: LocationFilter | null;
  filters: SearchFilters;
  setLocation: (location: LocationFilter) => void;
  setFilters: (newFilters: Partial<SearchFilters>) => void;
  resetFilters: () => void;
};

// Define the initial state for the filters
const initialFilters: SearchFilters = {
  priceRange: { min: '', max: '' },
  fuelType: null,
  sortBy: 'distance',
  amenities: [],
  rating: 0,
  requiredProducts: [], // You might want to use this for general product filtering later
};

export const useFilterStore = create<FilterStoreState>((set) => ({
  location: null,
  filters: initialFilters,
  setLocation: (location) => set({ location }),
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  resetFilters: () => set({ filters: initialFilters }),
}));
