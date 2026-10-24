import { File } from 'expo-file-system';
const { TextEncoder } = require('util');
import { createPhotoFormData } from '../photoFormData';

const { convertFormDataAsync } = jest.requireActual('expo/src/winter/fetch/convertFormData');

it('serializes actual JPEG bytes with Expo fetch instead of an unsupported URI part', async () => {
  // Exercise the installed Expo serializer: mocking fetch alone misses this failure.
  const originalEncoder = globalThis.TextEncoder;
  globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
  try {
    const body = createPhotoFormData('file:///capture.jpg');
    const serialized = await convertFormDataAsync(body, 'test-boundary');
    const bytes = Array.from(serialized.body as Uint8Array);
    const text = String.fromCharCode(...bytes);
    expect(text).toContain('\xff\xd8\xff\xd9');
    expect(text).toContain('name="file"; filename="capture.jpg"');
    expect(text).toContain('content-type: image/jpeg');
    expect(text).not.toContain('file:///');
  } finally {
    globalThis.TextEncoder = originalEncoder;
  }
});

it('reproduces the old URI-only upload rejection in the installed Expo serializer', async () => {
  const body = new FormData();
  body.append('file', { uri: 'file:///capture.jpg', name: 'capture.jpg', type: 'image/jpeg' } as unknown as Blob);
  await expect(convertFormDataAsync(body)).rejects.toThrow('Unsupported FormDataPart implementation');
});

it('reports an unreadable capture before making a network request', () => {
  jest.mocked(File).mockImplementationOnce(() => ({ exists: false }) as File);
  expect(() => createPhotoFormData('file:///missing.jpg')).toThrow('Could not read the captured photo');
});

it('rejects an empty capture', () => {
  jest.mocked(File).mockImplementationOnce(() => ({ exists: true, size: 0 }) as File);
  expect(() => createPhotoFormData('file:///empty.jpg')).toThrow('Could not read the captured photo');
});
