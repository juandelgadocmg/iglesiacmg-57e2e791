import React, { createContext, useContext } from "react";

const ThemeContext = createContext<any>(null);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export const useTheme = () => useContext(ThemeContext);
