// src/contexts/ThemeContext.jsx

import { createContext, useContext, useEffect, useState } from "react";

// Define un valor por defecto para el contexto, ayuda a evitar errores.
const ThemeProviderContext = createContext({
  theme: "system",
  setTheme: (theme) => console.log(`No provider for theme: ${theme}`),
});

export function ThemeProvider({ children, defaultTheme = "system", storageKey = "vite-ui-theme", ...props }) {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem(storageKey) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  // Este objeto 'value' es el que se pasa a todos los componentes hijos.
  // Es crucial que la clave 'setTheme' contenga una función.
  const value = {
    theme,
    setTheme: (newTheme) => {
      localStorage.setItem(storageKey, newTheme);
      setThemeState(newTheme); // Aquí se llama a la función real del 'useState'
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// Este hook es el que consumen los componentes.
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};