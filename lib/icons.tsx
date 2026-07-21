// Status icons for travel plans: hotel / flight / driving.
export type PlanStatus = "off" | "pending" | "done";

export function HotelIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M4 5v14h2v-3h12v3h2v-8a3 3 0 0 0-3-3h-7v5H6V5H4zm4.5 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    </svg>
  );
}

export function PlaneIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M21.5 15.5v-2l-8.5-5V3.75a1.25 1.25 0 0 0-2.5 0V8.5l-8.5 5v2l8.5-2.5v5.25L8 19.75V21.5l4-1 4 1v-1.75l-2.5-1.5V13l8 2.5z" />
    </svg>
  );
}

export function CarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M5.5 11l1.3-3.9a2 2 0 0 1 1.9-1.4h6.6a2 2 0 0 1 1.9 1.4L18.5 11H20a1 1 0 0 1 1 1v4.5h-2V18h-3v-1.5H8V18H5v-1.5H3V12a1 1 0 0 1 1-1h1.5zm2.1 0h8.8l-.9-2.8H8.5L7.6 11zM7 14.8a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6zm10 0a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6z" />
    </svg>
  );
}

export function statusClass(status: PlanStatus): string {
  return status === "done"
    ? "st-green"
    : status === "pending"
      ? "st-yellow"
      : "st-gray";
}
