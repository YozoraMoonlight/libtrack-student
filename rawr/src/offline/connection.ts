type ConnectionListener = (online: boolean) => void;
type RetryListener = () => void;

let apiOnline = true;
const connectionListeners = new Set<ConnectionListener>();
const retryListeners = new Set<RetryListener>();

export function isApiOnline(): boolean {
  return apiOnline;
}

export function setApiOnline(online: boolean): void {
  if (apiOnline === online) return;
  apiOnline = online;
  connectionListeners.forEach((listener) => listener(apiOnline));
}

export function subscribeConnection(listener: ConnectionListener): () => void {
  connectionListeners.add(listener);
  return () => connectionListeners.delete(listener);
}

export function subscribeRetry(listener: RetryListener): () => void {
  retryListeners.add(listener);
  return () => retryListeners.delete(listener);
}

export function retryRemoteData(): void {
  retryListeners.forEach((listener) => listener());
}
