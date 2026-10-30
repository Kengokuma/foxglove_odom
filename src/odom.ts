export type Pose = { x: number; y: number; z: number; yaw: number; frame: string };
export function readPose(message: unknown): Pose | undefined {
  const m = message as
    | {
        header?: { frame_id?: unknown };
        pose?: {
          pose?: {
            position?: { x?: unknown; y?: unknown; z?: unknown };
            orientation?: { x?: unknown; y?: unknown; z?: unknown; w?: unknown };
          };
        };
      }
    | undefined;
  const p = m?.pose?.pose?.position;
  const q = m?.pose?.pose?.orientation;
  if (!p || !q) {
    return undefined;
  }
  const values = [p.x, p.y, p.z, q.x, q.y, q.z, q.w];
  if (!values.every((v) => typeof v === "number" && Number.isFinite(v))) {
    return undefined;
  }
  const [x, y, z, qx, qy, qz, qw] = values as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const norm = Math.hypot(qx, qy, qz, qw);
  if (!Number.isFinite(norm) || norm < 1e-12) {
    return undefined;
  }
  const a = qx / norm,
    b = qy / norm,
    c = qz / norm,
    d = qw / norm;
  return {
    x,
    y,
    z,
    yaw: Math.atan2(2 * (d * c + a * b), 1 - 2 * (b * b + c * c)),
    frame: typeof m.header?.frame_id === "string" ? m.header.frame_id : "",
  };
}
export class Trajectory {
  public points: Pose[] = [];
  public current: Pose | undefined;
  public clear(): void {
    this.points = [];
    this.current = undefined;
  }
  public add(pose: Pose): void {
    if (this.current && this.current.frame !== pose.frame) {
      this.clear();
    }
    this.current = pose;
    const last = this.points[this.points.length - 1];
    if (!last || Math.hypot(last.x - pose.x, last.y - pose.y) >= 0.01) {
      this.points.push(pose);
      if (this.points.length > 10000) {
        this.points.splice(0, this.points.length - 10000);
      }
    }
  }
}
