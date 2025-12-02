// MapLibre style URLs - Using Maptiler's demo style (free, more reliable)
// This uses OpenStreetMap data with a stable tile server

export const MAPLIBRE_STYLES = {
  light: 'https://demotiles.maplibre.org/style.json',
  dark: 'https://demotiles.maplibre.org/style.json', // Using same style for now
};

// Helper function to get style URL based on theme
export const getMapStyle = (theme: 'light' | 'dark') => {
  return MAPLIBRE_STYLES[theme];
};

// Re-export for compatibility
export const createMapStyle = () => [];