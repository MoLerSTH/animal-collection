import { Directory, File, Paths } from 'expo-file-system';
import { discardPendingCapture, retainCapture, stagePendingCapture } from '../captureFiles';

describe('captureFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stages a file:// photo inside pending-captures after verifying existence', () => {
    const uri = stagePendingCapture('file:///tmp/photo-1.jpg', 'pending-123');
    expect(Directory).toHaveBeenCalledWith(Paths.document, 'pending-captures');
    expect(File).toHaveBeenCalledWith(expect.objectContaining({ uri: 'file:///documents/pending-captures' }), 'pending-123.jpg');
    expect(uri).toBe('file:///documents/pending-captures/pending-123.jpg');
  });

  it('throws when the source capture file does not exist or is empty', () => {
    jest.mocked(File).mockImplementationOnce(() => ({
      uri: 'file:///tmp/missing.jpg',
      exists: false,
      size: 0,
    }) as any);
    expect(() => stagePendingCapture('file:///tmp/missing.jpg', 'pending-123')).toThrow(
      'Could not read the captured photo. Please take another photo.',
    );
  });

  it('passes through non-file URIs without staging', () => {
    expect(stagePendingCapture('https://example.com/cat.jpg', 'pending-123')).toBe('https://example.com/cat.jpg');
  });

  it('deletes pending capture files inside pending-captures/ and ignores other paths', () => {
    const deleteMock = jest.fn();
    jest.mocked(File).mockImplementation((...parts: any[]) => ({
      uri: parts.map(part => part.uri || part).join('/'),
      exists: true,
      size: 4,
      copy: jest.fn(),
      delete: deleteMock,
    }) as any);

    discardPendingCapture('file:///documents/pending-captures/pending-123.jpg');
    expect(deleteMock).toHaveBeenCalledTimes(1);

    discardPendingCapture('file:///documents/captures/saved-1.jpg');
    discardPendingCapture('file:///gallery/user-photo.jpg');
    discardPendingCapture(undefined);
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });

  it('keeps retainCapture saving permanent copies inside captures/', () => {
    const uri = retainCapture('file:///documents/pending-captures/pending-123.jpg', 'req-1');
    expect(uri).toBe('file:///documents/captures/req-1.jpg');
  });
});
