import { ExtensionContext, PanelExtensionContext } from "@foxglove/extension";

import { readPose, Trajectory } from "./odom";

function initPanel(context: PanelExtensionContext): () => void {
  const root = context.panelElement;
  root.style.cssText =
    "display:flex;flex-direction:column;height:100%;background:#101827;color:#e2e8f0;font:13px system-ui;overflow:hidden";
  const toolbar = document.createElement("div");
  toolbar.style.cssText = "padding:12px;display:flex;gap:12px;align-items:center;flex-wrap:wrap";
  const title = document.createElement("strong");
  title.textContent = "/odom · XY trajectory";
  const clear = document.createElement("button");
  clear.textContent = "軌跡をクリア";
  toolbar.append(title, clear);
  const status = document.createElement("div");
  status.style.cssText = "padding:0 12px 10px;white-space:pre-wrap;font:13px monospace";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "display:block;width:100%;height:100%;min-height:0";
  const area = document.createElement("div");
  area.style.cssText = "flex:1;min-height:0;overflow:hidden";
  area.append(canvas);
  root.append(toolbar, status, area);
  const trajectory = new Trajectory();
  let invalid = false;
  function draw(): void {
    const p = trajectory.current;
    status.textContent = p
      ? `frame: ${p.frame || "(未指定)"}   x: ${p.x.toFixed(3)} m   y: ${p.y.toFixed(3)} m   z: ${p.z.toFixed(3)} m\nyaw: ${((p.yaw * 180) / Math.PI).toFixed(1)}°   軌跡: ${trajectory.points.length} 点${p.frame !== "odom" ? "\n注意: header.frame_id が odom ではありません。表示は受信座標系です（TF変換なし）。" : ""}${invalid ? "\n不正なOdometryメッセージをスキップしました。" : ""}`
      : invalid
        ? "/odom のメッセージ形式が不正です。nav_msgs/Odometry を確認してください。"
        : "/odom (nav_msgs/Odometry) を待機中…";
    const w = area.clientWidth,
      h = area.clientHeight;
    const ratio = window.devicePixelRatio;
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx || w === 0 || h === 0) {
      return;
    }
    ctx.scale(ratio, ratio);
    let minX = -1,
      maxX = 1,
      minY = -1,
      maxY = 1;
    for (const point of [...trajectory.points, ...(p ? [p] : [])]) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    const scale = Math.max(
      Number.MIN_VALUE,
      Math.min(Math.max(1, w - 80) / (maxY - minY), Math.max(1, h - 80) / (maxX - minX)),
    );
    const cx = (minX + maxX) / 2,
      cy = (minY + maxY) / 2;
    const sx = (y: number): number => w / 2 - (y - cy) * scale;
    const sy = (x: number): number => h / 2 - (x - cx) * scale;
    const step = 10 ** Math.ceil(Math.log10(60 / scale));
    ctx.lineWidth = 1;
    ctx.font = "11px monospace";
    for (let x = Math.ceil(minX / step) * step; x <= maxX; x += step) {
      ctx.strokeStyle = x === 0 ? "#64748b" : "#253247";
      ctx.beginPath();
      ctx.moveTo(0, sy(x));
      ctx.lineTo(w, sy(x));
      ctx.stroke();
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`X ${Number(x.toPrecision(4))}`, 4, sy(x) - 3);
    }
    for (let y = Math.ceil(minY / step) * step; y <= maxY; y += step) {
      ctx.strokeStyle = y === 0 ? "#64748b" : "#253247";
      ctx.beginPath();
      ctx.moveTo(sx(y), 0);
      ctx.lineTo(sx(y), h);
      ctx.stroke();
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`Y ${Number(y.toPrecision(4))}`, sx(y) + 3, h - 8);
    }
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    trajectory.points.forEach((point, i) => {
      if (i === 0) {
        ctx.moveTo(sx(point.y), sy(point.x));
      } else {
        ctx.lineTo(sx(point.y), sy(point.x));
      }
    });
    if (p) {
      ctx.lineTo(sx(p.y), sy(p.x));
    }
    ctx.stroke();
    if (p) {
      ctx.save();
      ctx.translate(sx(p.y), sy(p.x));
      ctx.rotate(-Math.PI / 2 - p.yaw);
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(-9, -8);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-9, 8);
      ctx.closePath();
      ctx.fillStyle = "#34d399";
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText("+X ↑   +Y ←   [m] · 自動フィット", 12, 20);
  }
  clear.onclick = () => {
    trajectory.clear();
    invalid = false;
    draw();
  };
  context.watch("currentFrame");
  context.watch("didSeek");
  context.subscribe([{ topic: "/odom" }]);
  context.onRender = (state, done) => {
    try {
      if (state.didSeek === true) {
        trajectory.clear();
        invalid = false;
      }
      for (const event of state.currentFrame ?? []) {
        if (event.topic !== "/odom") {
          continue;
        }
        const pose = readPose(event.message);
        if (pose) {
          trajectory.add(pose);
          invalid = false;
        } else {
          invalid = true;
        }
      }
      draw();
    } finally {
      done();
    }
  };
  const observer = new ResizeObserver(draw);
  observer.observe(area);
  draw();
  return () => {
    observer.disconnect();
    context.onRender = undefined;
    root.replaceChildren();
  };
}
export function activate(context: ExtensionContext): void {
  context.registerPanel({ name: "Odom Trajectory", initPanel });
}
