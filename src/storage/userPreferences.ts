import AsyncStorage from '@react-native-async-storage/async-storage';
import { RADIO_CATALOG } from '../data/radioCatalog';

const STORAGE_KEY = 'timeless-frequencies.preferences.v1';

export interface UserPreferences {
  openingAnimation: boolean | null;
  favoriteChannelIds: string[];
  selectedChannelId: string;
  volume: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  openingAnimation: null,
  favoriteChannelIds: [],
  selectedChannelId: 'en-global',
  volume: 0.72,
};

let pendingWrite: Promise<void> = Promise.resolve();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function loadUserPreferences(): Promise<UserPreferences> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    return { ...DEFAULT_PREFERENCES };
  }

  const parsed: unknown = JSON.parse(stored);
  if (
    !isRecord(parsed) ||
    !Array.isArray(parsed.favoriteChannelIds) ||
    !parsed.favoriteChannelIds.every((id) => typeof id === 'string') ||
    typeof parsed.selectedChannelId !== 'string' ||
    !RADIO_CATALOG.some((channel) => channel.id === parsed.selectedChannelId) ||
    typeof parsed.volume !== 'number' ||
    !Number.isFinite(parsed.volume) ||
    parsed.volume < 0 ||
    parsed.volume > 1 ||
    (parsed.openingAnimation !== undefined &&
      parsed.openingAnimation !== null &&
      typeof parsed.openingAnimation !== 'boolean')
  ) {
    throw new Error('Saved radio preferences are invalid.');
  }

  const knownChannelIds = new Set(RADIO_CATALOG.map((channel) => channel.id));
  return {
    openingAnimation:
      typeof parsed.openingAnimation === 'boolean'
        ? parsed.openingAnimation
        : null,
    favoriteChannelIds: parsed.favoriteChannelIds.filter((id) =>
      knownChannelIds.has(id),
    ),
    selectedChannelId: parsed.selectedChannelId,
    volume: parsed.volume,
  };
}

export function saveUserPreferences(
  preferences: UserPreferences,
): Promise<void> {
  const write = pendingWrite.then(() =>
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)),
  );
  pendingWrite = write.then(
    () => undefined,
    () => undefined,
  );
  return write;
}
