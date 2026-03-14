type PhotoAsset = {
  src: string;
  width?: number;
  height?: number;
  format?: string;
};

const photoModules = import.meta.glob('../content/images/*.{jpg,jpeg,png,webp,gif}', {
  eager: true,
  import: 'default'
}) as Record<string, PhotoAsset>;

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
    .map(([path, image]) => {
      const filename = path.split('/').pop() ?? path.split('\\').pop() ?? 'photo';

      return {
        src: image.src,
        image,
        filename,
        alt: toLabel(filename),
        width: image.width,
        height: image.height,
        timestamp: extractTimestamp(filename)
      };
    })
    .sort((left, right) => {
      if (left.timestamp !== right.timestamp) {
        return right.timestamp - left.timestamp;
      }

      return right.filename.localeCompare(left.filename);
    });
