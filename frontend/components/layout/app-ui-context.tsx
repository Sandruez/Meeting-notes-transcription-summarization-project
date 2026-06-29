"use client";

import { createContext, useContext } from "react";

interface AppUIContextValue {
  openCreateMeeting: () => void;
  openSearch: () => void;
}

export const AppUIContext = createContext<AppUIContextValue>({
  openCreateMeeting: () => {},
  openSearch: () => {},
});

export function useAppUI() {
  return useContext(AppUIContext);
}
