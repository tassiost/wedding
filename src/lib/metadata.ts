import { parse } from 'exifr';

export interface MediaMetadata {
  dateTaken?: string;
  camera?: string;
  lens?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  duration?: number; // For videos in seconds
  width?: number;
  height?: number;
}

export async function extractPhotoMetadata(file: File): Promise<MediaMetadata> {
  const metadata: MediaMetadata = {};

  try {
    const exifData = await parse(file, {
      tiff: true,
      ifd0: true,
      exif: true,
      gps: true,
      interop: false,
      makerNote: false,
    });

    // Extract date taken
    if (exifData.DateTimeOriginal) {
      metadata.dateTaken = exifData.DateTimeOriginal.toISOString();
    } else if (exifData.CreateDate) {
      metadata.dateTaken = exifData.CreateDate.toISOString();
    }

    // Extract camera info
    if (exifData.Make && exifData.Model) {
      metadata.camera = `${exifData.Make} ${exifData.Model}`;
    } else if (exifData.Model) {
      metadata.camera = exifData.Model;
    }

    // Extract lens info
    if (exifData.LensModel) {
      metadata.lens = exifData.LensModel;
    }

    // Extract GPS location
    if (exifData.latitude && exifData.longitude) {
      metadata.location = {
        latitude: exifData.latitude,
        longitude: exifData.longitude,
      };
    }

    // Extract dimensions
    if (exifData.PixelXDimension && exifData.PixelYDimension) {
      metadata.width = exifData.PixelXDimension;
      metadata.height = exifData.PixelYDimension;
    } else if (exifData.ImageWidth && exifData.ImageHeight) {
      metadata.width = exifData.ImageWidth;
      metadata.height = exifData.ImageHeight;
    }
  } catch (error) {
    console.error('Failed to extract EXIF metadata:', error);
  }

  return metadata;
}

export async function extractVideoMetadata(file: File): Promise<MediaMetadata> {
  const metadata: MediaMetadata = {};

  try {
    // Try to extract EXIF metadata from video (some formats like MOV have it)
    try {
      const exifData = await parse(file, {
        tiff: true,
        ifd0: true,
        exif: true,
        gps: true,
      });

      if (exifData.DateTimeOriginal) {
        metadata.dateTaken = exifData.DateTimeOriginal.toISOString();
      } else if (exifData.CreateDate) {
        metadata.dateTaken = exifData.CreateDate.toISOString();
      }

      if (exifData.Make && exifData.Model) {
        metadata.camera = `${exifData.Make} ${exifData.Model}`;
      } else if (exifData.Model) {
        metadata.camera = exifData.Model;
      }

      if (exifData.latitude && exifData.longitude) {
        metadata.location = {
          latitude: exifData.latitude,
          longitude: exifData.longitude,
        };
      }
    } catch (exifError) {
      // EXIF extraction failed, continue with video element metadata
      console.log('No EXIF data in video, using file metadata');
    }

    // Fallback to file's last modified date if no EXIF date found
    if (!metadata.dateTaken && file.lastModified) {
      metadata.dateTaken = new Date(file.lastModified).toISOString();
    }

    // Create a video element to extract duration and dimensions
    const video = document.createElement('video');
    video.preload = 'metadata';

    const metadataPromise = new Promise<MediaMetadata>((resolve) => {
      video.onloadedmetadata = () => {
        metadata.duration = video.duration;
        metadata.width = video.videoWidth;
        metadata.height = video.videoHeight;
        resolve(metadata);
      };

      video.onerror = () => {
        console.error('Failed to load video metadata');
        resolve(metadata);
      };
    });

    video.src = URL.createObjectURL(file);
    await metadataPromise;
    URL.revokeObjectURL(video.src);
  } catch (error) {
    console.error('Failed to extract video metadata:', error);
    // Final fallback to file last modified
    if (file.lastModified) {
      metadata.dateTaken = new Date(file.lastModified).toISOString();
    }
  }

  return metadata;
}

export async function extractMetadata(file: File): Promise<MediaMetadata> {
  if (file.type.startsWith('image/')) {
    return extractPhotoMetadata(file);
  } else if (file.type.startsWith('video/')) {
    return extractVideoMetadata(file);
  }
  return {};
}
