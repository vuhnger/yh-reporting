export function chunkArray<T>(items: T[], size: number): T[][] {
  if (!Number.isFinite(size) || !Number.isInteger(size) || size <= 0) {
    throw new RangeError("chunkArray requires a finite positive integer chunk size");
  }

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function mapChunksInParallel<T, TResult>(
  items: T[],
  chunkSize: number,
  mapper: (chunk: T[], chunkIndex: number) => Promise<TResult>
): Promise<TResult[]> {
  const chunks = chunkArray(items, chunkSize);
  return Promise.all(chunks.map((chunk, chunkIndex) => mapper(chunk, chunkIndex)));
}
