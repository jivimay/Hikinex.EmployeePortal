// Add approved logo files to public/logos and set their paths here.
// Paths are relative to public, so the /portal production base path is retained.
export const companyLogo = "";
export const applicationLogos: Record<string, string> = {
  // "mission-control": "logos/mission-control.svg",
  // "timekeeper": "logos/timekeeper.svg",
};

export function logoPath(path: string) {
  return `${process.env.PORTAL_BASE_PATH || ""}/${path.replace(/^\/+/, "")}`;
}
