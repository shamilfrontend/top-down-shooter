export interface Snapshot<T> {
  data: T;
  timestamp: number;
}

const BUFFER_MS = 150;

export class InterpolationBuffer<T> {
  private buffer: Snapshot<T>[] = [];
  private getLerpValue: (a: T, b: T, t: number) => T;

  constructor(getLerpValue: (a: T, b: T, t: number) => T) {
    this.getLerpValue = getLerpValue;
  }

  add(data: T) {
    const now = performance.now();
    this.buffer.push({ data, timestamp: now });
    while (this.buffer.length > 2 && now - this.buffer[0].timestamp > BUFFER_MS) {
      this.buffer.shift();
    }
  }

  get(renderDelay = 80): T | null {
    if (this.buffer.length === 0) return null;
    const now = performance.now();
    const renderTime = now - renderDelay;

    let from = this.buffer[0];
    let to = this.buffer[1];

    if (!to || renderTime >= to.timestamp) {
      return this.buffer[this.buffer.length - 1].data;
    }
    if (renderTime <= from.timestamp) {
      return from.data;
    }

    const t = (renderTime - from.timestamp) / (to.timestamp - from.timestamp);
    return this.getLerpValue(from.data, to.data, t);
  }
}
