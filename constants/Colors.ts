// File: constants/Colors.ts

// A helper function to convert Figma's RGB (0-1) to HEX
const rgbToHex = (r: number, g: number, b: number) => {
  const toHex = (c: number) => ('0' + Math.round(c * 255).toString(16)).slice(-2);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// --- Brand Colors ---
// This is the primary gold/yellow color used for buttons and highlights.
// Extracted from the "View" button in Figma (ID: 154:3254)
const brandGold = rgbToHex(0.929, 0.682, 0.062); // Approx #EDAE10

export const Colors = {
  // =================================================================
  // LIGHT THEME (Derived from Figma design)
  // =================================================================
  light: {
    // General
    background: '#FFFFFF', // Main screen background
    text: '#121212',       // Primary text (e.g., "NNPC" title)
    textSecondary: '#B8B8B8', // Lighter text (e.g., address)
    icon: '#4A4949',       // Default icon color

    // Brand / Accent
    primary: brandGold,
    primaryText: '#FFFFFF', // Text on top of a primary-colored button

    // Components
    cardBackground: '#FFFFFF',
    cardBorder: '#DFDFDF', // Border for station cards
    
    // Header & Tab Bar
    headerBackground: '#FFFFFF',
    tabIconSelected: brandGold,
    tabIconDefault: '#B8B8B8',
  },
  // =================================================================
  // DARK THEME (Designed to complement the light theme)
  // =================================================================
  dark: {
    // General
    background: '#121212',       // A dark, off-black for the main background
    text: '#E5E5E5',             // Off-white for primary text, easier on the eyes
    textSecondary: '#8A8A8A',   // Lighter gray for secondary text
    icon: '#A0A0A0',             // Default icon color

    // Brand / Accent
    primary: brandGold,          // The brand color stays consistent
    primaryText: '#121212',       // Dark text provides better contrast on the gold button
    
    // Components
    cardBackground: '#1E1E1E',   // A slightly lighter shade than the background
    cardBorder: '#333333',       // A subtle border for cards
    
    // Header & Tab Bar
    headerBackground: '#121212',
    tabIconSelected: brandGold,
    tabIconDefault: '#8A8A8A',
  },
};