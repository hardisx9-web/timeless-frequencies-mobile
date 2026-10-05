import { getStations, type RadioStation } from '../data/radioCatalog';

export function getSameLanguageAlternatives(
  channelId: string,
  currentStationId: string | null,
  excludedStationIds: ReadonlySet<string> = new Set(),
): RadioStation[] {
  const stations = getStations(channelId);
  if (stations.length < 2) {
    return [];
  }

  const currentIndex = stations.findIndex(
    (station) => station.id === currentStationId,
  );
  const startIndex = currentIndex < 0 ? 0 : currentIndex + 1;
  const orderedStations = [
    ...stations.slice(startIndex),
    ...stations.slice(0, startIndex),
  ];

  return orderedStations.filter(
    (station) =>
      station.id !== currentStationId &&
      !excludedStationIds.has(station.id),
  );
}

export function createSameLanguageRetunePlan(
  channelId: string,
  currentStationId: string | null,
): RadioStation[] {
  return getSameLanguageAlternatives(channelId, currentStationId);
}
