import { CyclingRoute } from '../types/cycling';

const STORAGE_KEY_OFFLINE_ROUTES = 'velonav_offline_routes_v1';
const STORAGE_KEY_OFFLINE_TILES_COUNT = 'velonav_cached_tiles_count';
const STORAGE_KEY_SETTINGS = 'velonav_settings';

export interface OfflineMapPack {
  routeId: string;
  routeName: string;
  downloadedAt: number;
  tileCount: number;
  sizeMb: number;
  route: CyclingRoute;
}

export class OfflineStorageManager {
  static getOfflinePacks(): OfflineMapPack[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY_OFFLINE_ROUTES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static isRouteSavedOffline(routeId: string): boolean {
    const packs = this.getOfflinePacks();
    return packs.some(p => p.routeId === routeId);
  }

  static async saveRouteOffline(route: CyclingRoute, onProgress?: (pct: number) => void): Promise<OfflineMapPack> {
    // Simulate caching tiles across bounding box of route
    const tileEstimate = Math.min(250, Math.max(45, Math.round(route.totalDistanceKm * 4.5)));
    const sizeMb = Math.round((tileEstimate * 0.045) * 10) / 10;

    for (let i = 1; i <= 5; i++) {
      if (onProgress) {
        onProgress(i * 20);
      }
      await new Promise(r => setTimeout(r, 80));
    }

    const pack: OfflineMapPack = {
      routeId: route.id,
      routeName: route.name,
      downloadedAt: Date.now(),
      tileCount: tileEstimate,
      sizeMb,
      route
    };

    const existing = this.getOfflinePacks().filter(p => p.routeId !== route.id);
    existing.unshift(pack);
    try {
      localStorage.setItem(STORAGE_KEY_OFFLINE_ROUTES, JSON.stringify(existing));
      const totalTiles = existing.reduce((sum, p) => sum + p.tileCount, 0);
      localStorage.setItem(STORAGE_KEY_OFFLINE_TILES_COUNT, totalTiles.toString());
    } catch (e) {
      console.warn('Storage limit reached while caching route:', e);
    }

    return pack;
  }

  static removeOfflinePack(routeId: string) {
    const existing = this.getOfflinePacks().filter(p => p.routeId !== routeId);
    localStorage.setItem(STORAGE_KEY_OFFLINE_ROUTES, JSON.stringify(existing));
  }

  static getTotalCachedSizeMb(): number {
    const packs = this.getOfflinePacks();
    return Math.round(packs.reduce((acc, p) => acc + p.sizeMb, 0) * 10) / 10;
  }
}
