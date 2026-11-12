import { Directory, File, Paths } from 'expo-file-system';

function copyCaptureToSubdir(uri: string, subdir: string, fileId: string): string {
  if (!uri.startsWith('file://')) return uri;
  const original = new File(uri);
  if (!original.exists || original.size === 0) {
    throw new Error('Could not read the captured photo. Please take another photo.');
  }
  const directory = new Directory(Paths.document, subdir);
  directory.create({ idempotent: true, intermediates: true });
  const destination = new File(directory, `${fileId}.jpg`);
  original.copy(destination);
  return destination.uri;
}

/** Camera output is temporary. Keep a durable copy before showing a saved card. */
export function retainCapture(uri: string, requestId: string): string {
  return copyCaptureToSubdir(uri, 'captures', requestId);
}

/** Stage a capture into a temporary pending directory before review/save. */
export function stagePendingCapture(uri: string, captureId: string): string {
  return copyCaptureToSubdir(uri, 'pending-captures', captureId);
}

/** Safely delete a staged pending capture file, ignoring missing or already-deleted files. */
export function discardPendingCapture(uri?: string): void {
  if (!uri || typeof uri !== 'string') return;
  const pendingDir = new Directory(Paths.document, 'pending-captures');
  const baseUri = pendingDir.uri.replace(/\/+$/, '');
  const pendingPrefix = `${baseUri}/`;
  if (!uri.startsWith(pendingPrefix)) return;

  const relative = uri.slice(pendingPrefix.length);
  if (!relative || relative.includes('/') || relative.includes('\\') || relative.includes('?') || relative.includes('#')) {
    return;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(relative);
  } catch {
    return;
  }

  if (
    decoded === '.' ||
    decoded === '..' ||
    decoded.includes('/') ||
    decoded.includes('\\') ||
    decoded.includes('..')
  ) {
    return;
  }

  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Missing or already cleaned up files never throw
  }
}
