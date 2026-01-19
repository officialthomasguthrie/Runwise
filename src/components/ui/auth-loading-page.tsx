"use client";

import * as React from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#bd28b3', // Same color as "Start Building" button
    },
  },
});

export function AuthLoadingPage() {
  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <ThemeProvider theme={theme}>
          <CircularProgress 
            enableTrackSlot 
            size={40}
            sx={{
              color: '#bd28b3',
            }}
          />
        </ThemeProvider>
        <p className="text-foreground text-lg font-light">Loading</p>
      </div>
    </div>
  );
}

