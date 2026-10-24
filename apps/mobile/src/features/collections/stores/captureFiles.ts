import { Directory, File, Paths } from 'expo-file-system';

/** Camera output is temporary. Keep a durable copy before showing a saved card. */
export function retainCapture(uri: string, requestId: string): string {
  if (!uri.startsWith('file://')) return uri;
  const original = new File(uri);
  if (!original.exists || original.size === 0) throw new Error('Could not read the captured photo. Please take another photo.');
  const directory = new Directory(Paths.document, 'captures');
  directory.create({idempotent: true, intermediates: true});
  const destination = new File(directory, `${requestId}.jpg`);
  original.copy(destination);
  return destination.uri;
}
