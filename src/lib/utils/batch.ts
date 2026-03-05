/**
 * Process items in batches with concurrency limit and progress reporting.
 * Uses a worker pool pattern: each worker pulls the next item as soon as it finishes.
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: {
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<R[]> {
  const { concurrency = 10, onProgress } = options;
  const results: R[] = new Array(items.length);
  let completed = 0;
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await processor(items[index], index);
      completed++;
      onProgress?.(completed, items.length);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runNext()
  );

  await Promise.all(workers);
  return results;
}
