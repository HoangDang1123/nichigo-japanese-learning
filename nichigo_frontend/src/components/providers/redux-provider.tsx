"use client";
import * as React from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "@/store";
import { checkSession } from "@/store/slices/auth-slice";

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  const [store] = React.useState<AppStore>(() => makeStore());
  React.useEffect(() => { void store.dispatch(checkSession()); }, [store]);
  return <Provider store={store}>{children}</Provider>;
}
