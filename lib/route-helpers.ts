import { PickupScheduleStop } from "./types";

function scoreAddress(address?: string | null) {
  if (!address) return 'zzzz';
  return address.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function suggestOptimizedRoute(stops: PickupScheduleStop[]) {
  return [...stops]
    .sort((a, b) => {
      const dateCmp = `${a.route_date || ''}`.localeCompare(`${b.route_date || ''}`);
      if (dateCmp !== 0) return dateCmp;
      const typeCmp = (a.stop_type === 'pickup' ? 0 : 1) - (b.stop_type === 'pickup' ? 0 : 1);
      if (typeCmp !== 0) return typeCmp;
      return scoreAddress(a.address).localeCompare(scoreAddress(b.address));
    })
    .map((stop, index) => ({ ...stop, suggested_sequence: index + 1 }));
}
