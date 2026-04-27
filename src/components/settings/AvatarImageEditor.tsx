import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import Avatar from '@/components/shared/Avatar';
import { useUIStore } from '@/store/uiStore';

const VIEWPORT_SIZE = 220;
const OUTPUT_SIZE = 512;

interface AvatarImageEditorProps {
  avatarColor: string;
  avatarUrl: string | null;
  /**
   * URL of the user's previously-uploaded ORIGINAL (uncropped) image, if any.
   * When set, the editor pre-loads it on mount so the user can re-position the
   * crop without re-uploading from disk.
   */
  avatarSourceUrl?: string | null;
  initials: string;
  /**
   * Fired whenever the visible crop changes. `cropped` is the 512×512 PNG to
   * upload as the displayed avatar. `originalBlob` is non-null only when the
   * user picked a fresh source image (so the parent knows it must upload a
   * new source); when the user is just re-positioning a previously-saved
   * source, `originalBlob` stays null.
   */
  onAvatarReady: (input: {
    cropped: Blob | null;
    originalBlob: Blob | null;
    originalMimeType: string | null;
    previewUrl: string | null;
  }) => void;
}

interface CropImageState {
  src: string;
  width: number;
  height: number;
}

interface Position {
  x: number;
  y: number;
}

function clampPosition(position: Position, image: CropImageState): Position {
  const scale = Math.max(VIEWPORT_SIZE / image.width, VIEWPORT_SIZE / image.height);
  const displayWidth = image.width * scale;
  const displayHeight = image.height * scale;
  const minX = VIEWPORT_SIZE - displayWidth;
  const minY = VIEWPORT_SIZE - displayHeight;

  return {
    x: Math.min(0, Math.max(minX, position.x)),
    y: Math.min(0, Math.max(minY, position.y)),
  };
}

function getCenteredPosition(image: CropImageState): Position {
  const scale = Math.max(VIEWPORT_SIZE / image.width, VIEWPORT_SIZE / image.height);
  const displayWidth = image.width * scale;
  const displayHeight = image.height * scale;
  return {
    x: (VIEWPORT_SIZE - displayWidth) / 2,
    y: (VIEWPORT_SIZE - displayHeight) / 2,
  };
}

async function makeCroppedAvatar(image: CropImageState, position: Position): Promise<Blob> {
  const scale = Math.max(VIEWPORT_SIZE / image.width, VIEWPORT_SIZE / image.height);
  const sourceX = Math.max(0, -position.x / scale);
  const sourceY = Math.max(0, -position.y / scale);
  const sourceSize = VIEWPORT_SIZE / scale;

  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Failed to prepare avatar preview.');

  const img = new Image();
  img.src = image.src;
  await img.decode();

  context.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('Failed to crop avatar image.'));
      else resolve(blob);
    }, 'image/png');
  });
}

export default function AvatarImageEditor({ avatarColor, avatarUrl, avatarSourceUrl, initials, onAvatarReady }: AvatarImageEditorProps) {
  const theme = useUIStore((s) => s.theme);
  const [image, setImage] = useState<CropImageState | null>(null);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Holds the user's freshly-picked original file. Stays null while the user
  // is re-positioning a previously-saved source (so the parent only uploads a
  // new source when the user actually picked a new one).
  const originalBlobRef = useRef<Blob | null>(null);
  const originalMimeRef = useRef<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const displayScale = useMemo(() => {
    if (!image) return 1;
    return Math.max(VIEWPORT_SIZE / image.width, VIEWPORT_SIZE / image.height);
  }, [image]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  // Pre-load the user's previously-uploaded ORIGINAL image on mount so they
  // can re-position the crop without re-uploading. Only fires once per
  // distinct `avatarSourceUrl` value.
  useEffect(() => {
    if (!avatarSourceUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = avatarSourceUrl;
        await img.decode();
        if (cancelled) return;

        const nextImage: CropImageState = {
          src: avatarSourceUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
        };
        const nextPosition = getCenteredPosition(nextImage);

        // Only seed the editor if no image is loaded yet — don't clobber a
        // fresh upload the user already made in this session.
        if (!image) {
          originalBlobRef.current = null; // existing source — no re-upload needed
          originalMimeRef.current = null;
          setImage(nextImage);
          setPosition(nextPosition);
        }
      } catch {
        // Network / CORS error — silently fall back to "no preloaded image".
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarSourceUrl]);

  async function handleFileChange(file: File | null) {
    if (!file) return;
    setError(null);

    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = objectUrl;
      await img.decode();

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = objectUrl;

      const nextImage = {
        src: objectUrl,
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
      const nextPosition = getCenteredPosition(nextImage);

      // Stash the freshly-picked file so the parent uploads it as the new
      // original source on the next save.
      originalBlobRef.current = file;
      originalMimeRef.current = file.type || null;

      setImage(nextImage);
      setPosition(nextPosition);

      const cropped = await makeCroppedAvatar(nextImage, nextPosition);
      onAvatarReady({
        cropped,
        originalBlob: originalBlobRef.current,
        originalMimeType: originalMimeRef.current,
        previewUrl: objectUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load image.');
    }
  }

  async function updateCrop(nextPosition: Position) {
    if (!image) return;
    const clamped = clampPosition(nextPosition, image);
    setPosition(clamped);
    const cropped = await makeCroppedAvatar(image, clamped);
    onAvatarReady({
      cropped,
      originalBlob: originalBlobRef.current,
      originalMimeType: originalMimeRef.current,
      previewUrl: image.src,
    });
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!image) return;
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      originX: position.x,
      originY: position.y,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current || !image) return;
    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;
    const nextPosition = clampPosition(
      { x: dragStartRef.current.originX + deltaX, y: dragStartRef.current.originY + deltaY },
      image
    );
    setPosition(nextPosition);
  }

  async function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current || !image) return;
    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;
    const nextPosition = {
      x: dragStartRef.current.originX + deltaX,
      y: dragStartRef.current.originY + deltaY,
    };
    dragStartRef.current = null;
    setDragging(false);
    await updateCrop(nextPosition);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-5 items-start">
        <div className="flex flex-col gap-2">
          <div
            className={`relative rounded-xl border overflow-hidden touch-none select-none ${
              theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'
            }`}
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              dragStartRef.current = null;
              setDragging(false);
            }}
          >
            {image ? (
              <img
                src={image.src}
                alt="Avatar crop source"
                draggable={false}
                className={`absolute max-w-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                style={{
                  width: image.width * displayScale,
                  height: image.height * displayScale,
                  transform: `translate(${position.x}px, ${position.y}px)`,
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Avatar user={{ avatarColor, avatarUrl, initials }} size="lg" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/45 [mask-image:radial-gradient(circle_at_center,transparent_0,transparent_72px,black_73px)]" />
            <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.08)]" />
          </div>
          <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Upload an image, then drag it to decide what appears inside the circular avatar.
          </p>
        </div>

        <label className="flex flex-col gap-2">
          <span className={`text-xs font-semibold uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Upload photo</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => void handleFileChange(event.target.files?.[0] ?? null)}
            className={`text-sm ${theme === 'dark' ? 'text-gray-200 file:bg-slate-800 file:text-gray-100 file:border-slate-700' : 'text-gray-700 file:bg-gray-100 file:text-gray-800 file:border-gray-200'} file:mr-3 file:px-3 file:py-2 file:rounded-md file:border file:cursor-pointer`}
          />
        </label>
      </div>

      {error && (
        <div className={`${theme === 'dark' ? 'text-sm text-red-400 bg-red-900/30 border border-red-700 rounded-md px-3 py-2' : 'text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2'}`}>
          {error}
        </div>
      )}
    </div>
  );
}
