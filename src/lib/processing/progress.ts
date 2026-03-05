export interface ProgressUpdate {
  stage: string;
  progress: number;
  detail?: string;
  error?: string;
  result?: string;
}

type Listener = (update: ProgressUpdate) => void;

const jobs = new Map<string, {
  current: ProgressUpdate;
  listeners: Set<Listener>;
}>();

export function createJob(jobId: string): void {
  jobs.set(jobId, {
    current: { stage: 'analyzing', progress: 0 },
    listeners: new Set(),
  });
}

export function updateProgress(jobId: string, update: ProgressUpdate): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.current = update;
  for (const listener of job.listeners) {
    listener(update);
  }
}

export function subscribe(jobId: string, listener: Listener): () => void {
  const job = jobs.get(jobId);
  if (!job) {
    listener({ stage: 'complete', progress: 100 });
    return () => {};
  }
  job.listeners.add(listener);
  listener(job.current);
  return () => {
    job.listeners.delete(listener);
  };
}

export function removeJob(jobId: string): void {
  setTimeout(() => jobs.delete(jobId), 30_000);
}

export function getProgress(jobId: string): ProgressUpdate | null {
  return jobs.get(jobId)?.current ?? null;
}
