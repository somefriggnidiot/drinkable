import type { Hours, Interval, OpeningStatus, Profile } from "./types";

const minutes = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
export function openingStatus(
  profile: Pick<Profile, "timezone" | "hours" | "exceptions">,
  now = new Date(),
): OpeningStatus {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: profile.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  const date = `${part("year")}-${part("month")}-${part("day")}`;
  const localDay = new Date(`${date}T12:00:00Z`);
  const weekday = localDay.getUTCDay();
  localDay.setUTCDate(localDay.getUTCDate() - 1);
  const previousDate = localDay.toISOString().slice(0, 10);
  const schedule = (d: string, day: number): Interval[] | undefined =>
    Object.hasOwn(profile.exceptions, d)
      ? profile.exceptions[d]
      : profile.hours[String(day)];
  const today = schedule(date, weekday);
  const previous = schedule(previousDate, (weekday + 6) % 7);
  const current = Number(part("hour")) * 60 + Number(part("minute"));
  // A date exception replaces all opening hours for that calendar date, including carry-over.
  const carry =
    !Object.hasOwn(profile.exceptions, date) &&
    previous?.some(
      (i) => minutes(i.close) <= minutes(i.open) && current < minutes(i.close),
    );
  const open =
    carry ||
    today?.some((i) =>
      minutes(i.close) <= minutes(i.open)
        ? current >= minutes(i.open)
        : current >= minutes(i.open) && current < minutes(i.close),
    );
  return {
    state: open ? "open" : today === undefined ? "unknown" : "closed",
    today: [
      ...(!Object.hasOwn(profile.exceptions, date)
        ? (previous || [])
            .filter((i) => minutes(i.close) <= minutes(i.open))
            .map((i) => ({ open: "00:00", close: i.close }))
        : []),
      ...(today ?? []),
    ],
  };
}
export function formatHours(intervals: Interval[]): string {
  const format = (value: string) =>
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(new Date(`2000-01-01T${value}:00Z`));
  return intervals.length
    ? intervals.map((i) => `${format(i.open)} – ${format(i.close)}`).join(", ")
    : "Closed";
}
export function validSchedule(hours: Hours): boolean {
  return Object.values(hours).every(
    (intervals) =>
      !intervals ||
      intervals.every(
        (i) =>
          /^([01]\d|2[0-3]):[0-5]\d$/.test(i.open) &&
          /^([01]\d|2[0-3]):[0-5]\d$/.test(i.close),
      ),
  );
}
