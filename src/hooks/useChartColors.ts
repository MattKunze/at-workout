import { useEffect, useState } from "react";

/**
 * Hook to get computed chart colors that respond to theme changes.
 * 
 * Since CSS variables in SVG fill attributes don't work properly,
 * we need to compute the actual color values from the CSS variables.
 * 
 * This hook reads the HSL CSS variables defined in index.css and
 * converts them to actual color strings that work in SVG.
 */
export function useChartColors() {
  const [colors, setColors] = useState({
    foreground: "hsl(222.2 84% 4.9%)",
    mutedForeground: "hsl(215.4 16.3% 46.9%)",
    card: "hsl(0 0% 100%)",
  });

  useEffect(() => {
    const computeColors = () => {
      // Get the computed style from the root element
      const root = document.documentElement;
      const style = getComputedStyle(root);

      // Read the HSL CSS variables
      const foregroundVar = style.getPropertyValue("--foreground").trim();
      const mutedForegroundVar = style.getPropertyValue("--muted-foreground").trim();
      const cardVar = style.getPropertyValue("--card").trim();
      
      // Convert to HSL color strings
      const foreground = foregroundVar ? `hsl(${foregroundVar})` : "hsl(222.2 84% 4.9%)";
      const mutedForeground = mutedForegroundVar ? `hsl(${mutedForegroundVar})` : "hsl(215.4 16.3% 46.9%)";
      const card = cardVar ? `hsl(${cardVar})` : "hsl(0 0% 100%)";

      setColors({
        foreground,
        mutedForeground,
        card,
      });
    };

    // Compute colors initially
    computeColors();

    // Watch for theme changes by observing the data-theme attribute
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-theme"
        ) {
          // Re-compute after a brief delay to let CSS variables update
          setTimeout(computeColors, 10);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return colors;
}
