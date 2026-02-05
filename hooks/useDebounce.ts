// File: hooks/useDebounce.ts

import { useState, useEffect } from 'react';

/**
 * A custom React hook that delays updating a value until a certain amount of time
 * has passed without that value changing. This is useful for performance-heavy
 * operations like API calls based on user input (e.g., in a search bar).
 *
 * @param value The value to be debounced (e.g., the text from a search input).
 * @param delay The delay in milliseconds before the debounced value is updated.
 * @returns The debounced value, which only updates after the delay.
 */
export function useDebounce<T>(value: T, delay: number): T {
  // State to store the debounced value
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(
    () => {
      // Set up a timer to update the debounced value after the specified delay
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      // This is the cleanup function that runs every time the effect is re-triggered.
      // If the 'value' changes (i.e., the user types again), it clears the previous
      // timer and a new one is set, effectively resetting the delay.
      return () => {
        clearTimeout(handler);
      };
    },
    [value, delay] // Only re-run the effect if the value or the delay changes
  );

  return debouncedValue;
}