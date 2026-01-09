export class BatteryEngine {
  constructor({ ui, settings }) {
    this.ui = ui;
    this.settings = settings;
    this.tasks = [];
    this.metrics = {};
    this.validity = {
      instructionFails: 0,
      fastRts: false,
      nonEngaged: false,
      sstNoncompliant: false,
      sjtImplausible: false,
      rbImplausible: false,
      ddImplausible: false,
      timingJitter: false
    };
    this.jitter = {
      samples: 0,
      over50ms: 0
    };
  }

  addTask(task) {
    this.tasks.push(task);
  }

  async runAll() {
    this.startJitterMonitor();
    for (let i = 0; i < this.tasks.length; i += 1) {
      const task = this.tasks[i];
      this.ui.setProgress(i / this.tasks.length);
      await task.init?.(this.ui, this.settings, this);
      const result = await task.run(this.ui, this.settings, this);
      await task.cleanup?.(this.ui, this.settings, this);
      if (result?.metrics) {
        Object.assign(this.metrics, result.metrics);
      }
      if (result?.validity) {
        Object.assign(this.validity, result.validity);
      }
    }
    this.ui.setProgress(1);
    this.stopJitterMonitor();
    return {
      metrics: this.metrics,
      validity: this.validity,
      jitter: this.jitter
    };
  }

  startJitterMonitor() {
    this.jitter.samples = 0;
    this.jitter.over50ms = 0;
    this._lastFrame = performance.now();
    const loop = (ts) => {
      const delta = ts - this._lastFrame;
      this._lastFrame = ts;
      this.jitter.samples += 1;
      if (delta > 50) {
        this.jitter.over50ms += 1;
      }
      this._jitterFrame = requestAnimationFrame(loop);
    };
    this._jitterFrame = requestAnimationFrame(loop);
  }

  stopJitterMonitor() {
    if (this._jitterFrame) {
      cancelAnimationFrame(this._jitterFrame);
      this._jitterFrame = null;
    }
    if (this.jitter.samples > 0) {
      const ratio = this.jitter.over50ms / this.jitter.samples;
      this.validity.timingJitter = ratio > 0.1;
    }
  }
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function iqr(values) {
  if (values.length < 4) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  return q3 - q1;
}

export function auc(points) {
  let area = 0;
  for (let i = 1; i < points.length; i += 1) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    area += (x1 - x0) * (y0 + y1) / 2;
  }
  return area;
}
