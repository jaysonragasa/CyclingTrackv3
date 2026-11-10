import { LatLng } from '../types/cycling';

export interface GPSUpdate {
  coords: LatLng;
  speedKmh: number;
  altitudeM?: number;
  headingDeg?: number;
  accuracyM: number;
  timestamp: number;
}

export class GPSTrackerService {
  private static watchId: number | null = null;
  private static lastPosition: GeolocationPosition | null = null;

  static isGeolocationAvailable(): boolean {
    return typeof window !== 'undefined' && 'geolocation' in navigator;
  }

  static getCurrentPosition(): Promise<LatLng> {
    return new Promise((resolve, reject) => {
      if (!this.isGeolocationAvailable()) {
        reject(new Error('Geolocation not supported on this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            ele: pos.coords.altitude ?? 15
          });
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  static startTracking(onUpdate: (update: GPSUpdate) => void, onError?: (err: GeolocationPositionError) => void): boolean {
    if (!this.isGeolocationAvailable()) {
      return false;
    }

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const rawSpeed = pos.coords.speed; // m/s
        const speedKmh = rawSpeed !== null && rawSpeed >= 0 ? Math.round(rawSpeed * 3.6 * 10) / 10 : 0;
        const altitudeM = pos.coords.altitude !== null ? Math.round(pos.coords.altitude) : undefined;
        const headingDeg = pos.coords.heading !== null && !isNaN(pos.coords.heading) ? Math.round(pos.coords.heading) : undefined;

        this.lastPosition = pos;

        onUpdate({
          coords: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            ele: altitudeM
          },
          speedKmh,
          altitudeM,
          headingDeg,
          accuracyM: Math.round(pos.coords.accuracy),
          timestamp: pos.timestamp
        });
      },
      (err) => {
        if (onError) onError(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000
      }
    );

    return true;
  }

  static stopTracking() {
    if (this.watchId !== null && typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}
