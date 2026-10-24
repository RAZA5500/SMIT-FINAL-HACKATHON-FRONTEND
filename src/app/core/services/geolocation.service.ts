import { Injectable, NgZone, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface GeoFix {
  lat: number;
  lng: number;
  /** Reported accuracy radius in metres. */
  accuracy: number;
  at: number;
}

export type GeoErrorKind = 'unsupported' | 'insecure' | 'denied' | 'unavailable' | 'timeout';

export class GeoError extends Error {
  constructor(
    readonly kind: GeoErrorKind,
    message: string,
  ) {
    super(message);
  }
}

const MESSAGES: Record<GeoErrorKind, string> = {
  unsupported: 'This browser does not support location access.',
  insecure: 'Location needs a secure connection (HTTPS or localhost).',
  denied: 'Location permission was denied. Allow location access in your browser settings and retry.',
  unavailable: 'Your position could not be determined. Move closer to a window or turn on Wi-Fi/GPS.',
  timeout: 'Getting your location took too long. Please retry.',
};

/** Thin wrapper over navigator.geolocation (high accuracy, no caching). */
@Injectable({ providedIn: 'root' })
export class GeolocationService {
  private readonly zone = inject(NgZone);

  /** Continuous fixes while subscribed. */
  watch(): Observable<GeoFix> {
    return new Observable<GeoFix>((subscriber) => {
      const problem = this.precheck();
      if (problem) {
        subscriber.error(problem);
        return undefined;
      }
      const id = navigator.geolocation.watchPosition(
        (pos) => this.zone.run(() => subscriber.next(this.toFix(pos))),
        (err) => this.zone.run(() => subscriber.error(this.toError(err))),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
      );
      return () => navigator.geolocation.clearWatch(id);
    });
  }

  /** A single fix. */
  current(): Promise<GeoFix> {
    return new Promise<GeoFix>((resolve, reject) => {
      const problem = this.precheck();
      if (problem) return reject(problem);
      navigator.geolocation.getCurrentPosition(
        (pos) => this.zone.run(() => resolve(this.toFix(pos))),
        (err) => this.zone.run(() => reject(this.toError(err))),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
      );
    });
  }

  private precheck(): GeoError | null {
    if (typeof window !== 'undefined' && window.isSecureContext === false) return new GeoError('insecure', MESSAGES.insecure);
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return new GeoError('unsupported', MESSAGES.unsupported);
    return null;
  }

  private toFix(pos: GeolocationPosition): GeoFix {
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: Math.round(pos.coords.accuracy),
      at: pos.timestamp,
    };
  }

  private toError(err: GeolocationPositionError): GeoError {
    const kind: GeoErrorKind = err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.TIMEOUT ? 'timeout' : 'unavailable';
    return new GeoError(kind, MESSAGES[kind]);
  }
}
