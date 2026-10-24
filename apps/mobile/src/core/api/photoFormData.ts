import { File } from 'expo-file-system';

export class PhotoFileError extends Error {}

/** Attach a readable File: Expo's fetch does not accept RN's legacy { uri } parts. */
export function createPhotoFormData(imageUri: string): FormData {
  try {
    const photo = new File(imageUri);
    if (!photo.exists || photo.size === 0) {
      throw new Error('Photo is missing or empty');
    }
    const body = new FormData();
    body.append('file', photo);
    return body;
  } catch {
    throw new PhotoFileError('Could not read the captured photo. Please take another photo.');
  }
}
