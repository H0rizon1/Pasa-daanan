import { createContext, useContext, useState } from "react";

type Theme = "dark" | "light";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  colors: {
    background: string;
    card: string;
    cardSecondary: string;
    heading: string;
    text: string;
    subtitle: string;
    border: string;
    cardBorder: string;
    input: string;
    placeholder: string;
  };
};

const darkColors = {
  background: "#1a1a2e",
  card: "#5BA3E0",
  cardSecondary: "#16213e",
  heading: "#FF8C42",
  text: "#ffffff",
  subtitle: "#888",
  border: "#FF8C42",
  cardBorder: "#e94560",
  input: "#16213e",
  placeholder: "#888",
};

const lightColors = {
  background: "#F5F5F5",
  card: "#5ba3e0",
  cardSecondary: "#ffffff",
  heading: "#FF8C42",
  text: "#1a1a2e",
  subtitle: "#666666",
  border: "#FF8C42",
  cardBorder: "#e0e0e0",
  input: "#ffffff",
  placeholder: "#999999",
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  colors: darkColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        colors: theme === "dark" ? darkColors : lightColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
