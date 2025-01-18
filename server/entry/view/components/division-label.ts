export function divisionLabel(name: string): string {
  return {
    solo: "Solo",
    team: "Team",
    unranked: "Open"
  }[name] || "Unknown";
}
