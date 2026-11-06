import { LearningPathJourney, type LearningPathData } from "./learning-path-journey";

/** Published content and verified progress will be adapted here by JPN-020/JPN-040. */
export function LearningPathState() {
  const path: LearningPathData | null = null;
  return <LearningPathJourney path={path} />;
}
