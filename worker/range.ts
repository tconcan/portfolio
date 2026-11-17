export interface ByteRange {
  start: number;
  /** Inclusive */
  end: number;
}

/**
 * Parse a single-range HTTP `Range` header ("bytes=0-1", "bytes=100-",
 * "bytes=-500") against a resource of `size` bytes. Returns null when the
 * header is malformed or the range can't be satisfied (→ 416).
 */
export function parseRange(header: string, size: number): ByteRange | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || size <= 0) return null;
  const [, from, to] = match;

  let start: number;
  let end: number;
  if (from === "" && to !== "") {
    // Suffix range: the last N bytes
    start = Math.max(0, size - Number(to));
    end = size - 1;
  } else if (from !== "") {
    start = Number(from);
    end = to === "" ? size - 1 : Math.min(Number(to), size - 1);
  } else {
    return null;
  }

  return start <= end && start < size ? { start, end } : null;
}
