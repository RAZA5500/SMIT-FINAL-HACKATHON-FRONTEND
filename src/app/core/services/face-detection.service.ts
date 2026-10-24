import { Injectable, signal } from '@angular/core';
import type { FaceLandmarks68, Point } from '@vladmandic/face-api';
import { environment } from '../../../environments/environment';

type FaceApi = typeof import('@vladmandic/face-api');

/** The parts of the bundled tfjs runtime used here (typed loosely by face-api). */
interface TfRuntime {
  setBackend(name: string): Promise<boolean>;
  ready(): Promise<void>;
  getBackend(): string;
  env(): { flagRegistry: Record<string, unknown>; set(flag: string, value: unknown): void };
}

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
}

export interface FaceScan {
  count: number;
  boxes: FaceBox[];
  /** Eye aspect ratio of the single detected face (blink liveness), else null. */
  ear: number | null;
  frameWidth: number;
  frameHeight: number;
}

/**
 * Client-side face detection with @vladmandic/face-api (TinyFaceDetector + tiny 68-point
 * landmarks). The library and models load lazily, only when the camera modal opens.
 * Frames never leave the device — only the face count is sent to the server.
 */
@Injectable({ providedIn: 'root' })
export class FaceDetectionService {
  private api: FaceApi | null = null;
  private loading: Promise<FaceApi> | null = null;

  readonly status = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');

  load(): Promise<FaceApi> {
    if (this.api) return Promise.resolve(this.api);
    this.loading ??= this.init();
    return this.loading;
  }

  async scan(video: HTMLVideoElement): Promise<FaceScan> {
    const faceapi = await this.load();
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
    const results = await faceapi.detectAllFaces(video, options).withFaceLandmarks(true);
    return {
      count: results.length,
      boxes: results.map((r) => ({
        x: r.detection.box.x,
        y: r.detection.box.y,
        width: r.detection.box.width,
        height: r.detection.box.height,
        score: r.detection.score,
      })),
      ear: results.length === 1 ? eyeAspectRatio(results[0].landmarks) : null,
      frameWidth: video.videoWidth,
      frameHeight: video.videoHeight,
    };
  }

  private async init(): Promise<FaceApi> {
    this.status.set('loading');
    try {
      const faceapi = await import('@vladmandic/face-api');
      const tf = faceapi.tf as unknown as TfRuntime;
      const webgl = await tf.setBackend('webgl').catch(() => false);
      if (!webgl) await tf.setBackend('cpu');
      await tf.ready();
      if (tf.env().flagRegistry['CANVAS2D_WILL_READ_FREQUENTLY']) tf.env().set('CANVAS2D_WILL_READ_FREQUENTLY', true);
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(environment.faceModelsUrl),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(environment.faceModelsUrl),
      ]);
      this.api = faceapi;
      this.status.set('ready');
      return faceapi;
    } catch (error) {
      this.loading = null;
      this.status.set('error');
      throw error;
    }
  }
}

/** EAR = (|p2−p6| + |p3−p5|) / (2·|p1−p4|), averaged over both eyes; drops sharply on a blink. */
function eyeAspectRatio(landmarks: FaceLandmarks68): number {
  const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  const ear = (eye: Point[]) => (dist(eye[1], eye[5]) + dist(eye[2], eye[4])) / (2 * dist(eye[0], eye[3]) || 1);
  return (ear(landmarks.getLeftEye()) + ear(landmarks.getRightEye())) / 2;
}
