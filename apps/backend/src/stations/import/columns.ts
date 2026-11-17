/** Growable typed array. */
export class Column<T extends Float64Array | Int32Array | Uint8Array> {
  length = 0;

  constructor(
    private data: T,
    private readonly make: (size: number) => T,
  ) {}

  push(value: number): void {
    if (this.length === this.data.length) {
      const grown = this.make(this.data.length * 2);
      grown.set(this.data);
      this.data = grown;
    }
    this.data[this.length++] = value;
  }

  get(i: number): number {
    return this.data[i];
  }

  /** The values, trimmed. */
  values(): T {
    return this.data.subarray(0, this.length) as T;
  }
}

export const float64 = (size: number) => new Float64Array(size);
export const int32 = (size: number) => new Int32Array(size);
export const uint8 = (size: number) => new Uint8Array(size);
