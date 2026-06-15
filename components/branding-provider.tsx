'use client';

import React, { createContext, useContext, useState } from 'react';

type BrandingContextType = {
  collegeName: string;
  logoUrl: string;
};

const BrandingContext = createContext<BrandingContextType>({
  collegeName: 'CMR National PU College',
  logoUrl: '/logo.png',
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding] = useState({
    collegeName: 'CMR National PU College',
    logoUrl: '/logo.png',
  });

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);
