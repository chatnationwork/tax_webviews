'use client';

import { createContext, useContext, type ReactNode } from 'react';

export interface RuntimeConfig {
  whatsappNumber: string | undefined;
  analyticsEndpoint: string | undefined;
  analyticsWriteKey: string | undefined;
  allowDesktopTesting: boolean;
  services: Record<string, string | undefined>;
}

const ConfigContext = createContext<RuntimeConfig | null>(null);

export function ConfigProvider({
  config,
  children,
}: {
  config: RuntimeConfig;
  children: ReactNode;
}) {
  return (
    <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
  );
}

export function useConfig(): RuntimeConfig {
  const config = useContext(ConfigContext);
  if (!config) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return config;
}
