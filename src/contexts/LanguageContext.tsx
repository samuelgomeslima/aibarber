import React from "react";

import { getInitialLanguage, type SupportedLanguage } from "../locales/language";

type LanguageContextValue = {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
};

const LanguageContext = React.createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [language, setLanguage] = React.useState<SupportedLanguage>(() => getInitialLanguage());
  const value = React.useMemo(() => ({ language, setLanguage }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguageContext(): LanguageContextValue {
  const context = React.useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguageContext must be used within a LanguageProvider");
  }
  return context;
}

export function useOptionalLanguageContext(): LanguageContextValue | undefined {
  return React.useContext(LanguageContext);
}

export { LanguageContext };
