import type { CourseEnvelope } from "@/lib/game/course-types";
import { emptyState, todayKey } from "@/lib/game/types";
import { normalizeCourse } from "@/lib/game/course";

/** The normal game does not download/store protected parental histories. */
export function gameView<T extends CourseEnvelope>(envelope: T): T {
  const state = envelope.state;
  const course = normalizeCourse(state);
  const today = todayKey();
  return {
    ...envelope,
    state: {
      ...emptyState(),
      childName: state.childName,
      sound: state.sound,
      onboarded: state.onboarded,
      // Old cosmetic unlocks are child-visible achievements, not answer-level reports.
      planetStars: state.planetStars,
      cosmetics: state.cosmetics,
      club: { ...state.club!, rewardDays: {} },
      course: {
        ...course,
        rewardDays: Object.hasOwn(course.rewardDays, today)
          ? { [today]: course.rewardDays[today] }
          : {},
      },
    },
  };
}
