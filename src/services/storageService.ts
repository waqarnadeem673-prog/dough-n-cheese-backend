import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/utils/withTimeout';

export const PRODUCT_IMAGES_BUCKET = 'product-images';
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export type ImageUploadResult = {
  url: string | null;
  error: Error | null;
};

export const storageService = {
  /**
   * Validates selected image file type and size
   */
  validateImageFile(file: File): { isValid: boolean; error: string | null } {
    if (!file) {
      return { isValid: false, error: 'No file selected.' };
    }

    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    const isExtensionValid =
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.png') ||
      fileName.endsWith('.webp');

    if (!ALLOWED_IMAGE_TYPES.includes(fileType) && !isExtensionValid) {
      return {
        isValid: false,
        error: 'Invalid file format. Please upload a JPG, JPEG, PNG, or WebP image.',
      };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return {
        isValid: false,
        error: `File is too large (${sizeMb} MB). Maximum allowed size is 5 MB.`,
      };
    }

    return { isValid: true, error: null };
  },

  /**
   * Uploads an image file to Supabase Storage bucket and returns public URL
   */
  async uploadProductImage(file: File): Promise<ImageUploadResult> {
    const validation = this.validateImageFile(file);
    if (!validation.isValid) {
      return { url: null, error: new Error(validation.error || 'Invalid file') };
    }

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const randomKey = Math.random().toString(36).substring(2, 9);
      const cleanFileName = `${timestamp}-${randomKey}.${fileExt}`;
      const filePath = `products/${cleanFileName}`;

      const { data, error: uploadError } = await withTimeout(
        supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          }),
        30_000,
        'Image upload'
      );

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError);
        return {
          url: null,
          error: new Error(`Upload failed: ${uploadError.message}`),
        };
      }

      if (!data?.path) {
        return {
          url: null,
          error: new Error('Upload completed but storage path was not returned.'),
        };
      }

      const { data: publicUrlData } = supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .getPublicUrl(data.path);

      if (!publicUrlData?.publicUrl) {
        return {
          url: null,
          error: new Error('Failed to generate public URL for uploaded image.'),
        };
      }

      return { url: publicUrlData.publicUrl, error: null };
    } catch (err) {
      return {
        url: null,
        error: err instanceof Error ? err : new Error('An unexpected error occurred during image upload.'),
      };
    }
  },
};
