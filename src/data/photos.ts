type PhotoModule =
  | string
  | {
      src: string;
      width?: number;
      height?: number;
      format?: string;
    };

const photoModules = import.meta.glob('../content/images/*.{jpg,jpeg,png,webp,gif}', {
  eager: true,
  import: 'default'
}) as Record<string, PhotoModule>;

const extractTimestamp = (filename: string) => {
  const digits = filename.replace(/\D/g, '');
  if (digits.length < 8) {
    return 0;
  }

  const value = Number(digits.slice(0, 14));
  return Number.isFinite(value) ? value : 0;
};

const toLabel = (filename: string) =>
  filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

export const getPhotos = () =>
  Object.entries(photoModules)
    .map(([path, src]) => {
      const filename = path.split('/').pop() ?? path.split('\\').pop() ?? 'photo';
      const imageSrc = typeof src === 'string' ? src : src.src;
      const width = typeof src === 'string' ? undefined : src.width;
      const height = typeof src === 'string' ? undefined : src.height;

      return {
        src: imageSrc,
        filename,
        alt: toLabel(filename),
        width,
        height,
        timestamp: extractTimestamp(filename)
      };
    })
    .sort((left, right) => {
      if (left.timestamp !== right.timestamp) {
        return right.timestamp - left.timestamp;
      }

      return right.filename.localeCompare(left.filename);
    });
