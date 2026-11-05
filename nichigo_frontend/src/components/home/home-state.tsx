"use client";

import { useAppSelector } from "@/store/hooks";
import { HomeStudyDesk, type HomeProgress } from "./home-study-desk";

/** JPN-040/041 will adapt verified learning data here. Auth contains identity only. */
export function HomeState() {
  const { status, user } = useAppSelector((state) => state.auth);
  const progress: HomeProgress | null = null;

  return <HomeStudyDesk status={status} authenticated={status === "authenticated" && Boolean(user)} progress={progress} />;
}
