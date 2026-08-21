import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import {
  Image as ImageIcon,
  Link as LinkIcon,
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  FileImage,
} from 'lucide-react';
import { storageService, MAX_FILE_SIZE_BYTES } from '@/services/storageService';

type ProductImageFieldProps = {
  imageUrl: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  onUploadStateChange?: (isUploading: boolean) => void;
};

type ImageSourceMode = 'url' | 'upload';

export default function ProductImageField({
  imageUrl,
  onChange,
  disabled = false,
  onUploadStateChange,
}: ProductImageFieldProps) {
  const [mode, setMode] = useState<ImageSourceMode>('url');
  const [urlInput, setUrlInput] = useState<string>(imageUrl || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imgError, setImgError] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync external imageUrl with local urlInput when prop changes
  useEffect(() => {
    setUrlInput(imageUrl || '');
  }, [imageUrl]);

  // Clean up object URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (localPreview && localPreview.startsWith('blob:')) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  const handleModeChange = (newMode: ImageSourceMode) => {
    setMode(newMode);
    setUploadError(null);
    setImgError(false);
  };

  const handleUrlChange = (val: string) => {
    setUrlInput(val);
    setImgError(false);
    setUploadError(null);
    onChange(val.trim());
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadError(null);
    setImgError(false);

    // Validate client-side
    const validation = storageService.validateImageFile(file);
    if (!validation.isValid) {
      setUploadError(validation.error || 'Invalid file');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);

    // Create immediate local object URL for preview
    if (localPreview && localPreview.startsWith('blob:')) {
      URL.revokeObjectURL(localPreview);
    }
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);

    // Perform upload
    setIsUploading(true);
    if (onUploadStateChange) onUploadStateChange(true);

    try {
      const { url, error } = await storageService.uploadProductImage(file);

      if (error || !url) {
        setUploadError(error?.message || 'Failed to upload image. Please try again.');
      } else {
        onChange(url);
        setUrlInput(url);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'An error occurred during upload.');
    } finally {
      setIsUploading(false);
      if (onUploadStateChange) onUploadStateChange(false);
    }
  };

  const handleClearSelectedFile = () => {
    setSelectedFile(null);
    if (localPreview && localPreview.startsWith('blob:')) {
      URL.revokeObjectURL(localPreview);
    }
    setLocalPreview(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Determine active display preview image
  const displayImage = localPreview || imageUrl;

  return (
    <div className="space-y-4">
      {/* Label and Mode Switcher */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-ink-300">
          Product Image
        </label>

        {/* Mode Toggle (URL vs Upload) */}
        <div className="inline-flex rounded-xl border border-white/10 bg-ink-950/80 p-1">
          <button
            type="button"
            onClick={() => handleModeChange('url')}
            disabled={disabled || isUploading}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              mode === 'url'
                ? 'bg-primary-500 text-ink-950 shadow-sm'
                : 'text-ink-400 hover:text-white'
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5" />
            <span>Image URL</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('upload')}
            disabled={disabled || isUploading}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              mode === 'upload'
                ? 'bg-primary-500 text-ink-950 shadow-sm'
                : 'text-ink-400 hover:text-white'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Image</span>
          </button>
        </div>
      </div>

      {/* Option A: Image URL Input */}
      {mode === 'url' && (
        <div className="space-y-1.5">
          <div className="relative">
            <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <input
              id="product-image-url"
              type="url"
              value={urlInput}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://example.com/images/pizza.jpg"
              disabled={disabled || isUploading}
              className="w-full rounded-xl border border-white/10 bg-ink-950/60 py-3 pl-11 pr-4 text-sm text-ink-100 placeholder-ink-600 outline-none transition-colors focus:border-primary-500/50 focus:bg-ink-950 disabled:opacity-50"
            />
          </div>
          <p className="text-[11px] text-ink-500">
            Paste a direct URL to an image (JPG, PNG, WebP).
          </p>
        </div>
      )}

      {/* Option B: Image Upload Dropzone / Button */}
      {mode === 'upload' && (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            id="product-image-file"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
            className="hidden"
          />

          <div
            onClick={() => {
              if (!disabled && !isUploading) {
                fileInputRef.current?.click();
              }
            }}
            className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
              isUploading
                ? 'border-primary-500/50 bg-primary-500/5'
                : 'border-white/10 bg-ink-950/40 hover:border-primary-500/40 hover:bg-ink-950/80'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
                <span className="text-xs font-semibold text-primary-300">
                  Uploading image to Supabase Storage...
                </span>
                <span className="text-[10px] text-ink-500">
                  Please wait while your image is stored and optimized
                </span>
              </div>
            ) : selectedFile ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-400">
                  <FileImage className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-ink-100">{selectedFile.name}</p>
                  <p className="text-[10px] text-ink-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Click to choose a different file
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearSelectedFile();
                  }}
                  className="ml-2 rounded-lg p-1 text-ink-400 hover:bg-white/10 hover:text-white"
                  title="Remove chosen file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-ink-400 transition-colors group-hover:bg-primary-500/10 group-hover:text-primary-400">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-ink-200 group-hover:text-primary-300">
                    Click to browse or choose an image file
                  </span>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    Supports JPG, PNG, WebP up to {MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="flex items-start gap-2 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-xs text-error-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error-400" />
          <div className="flex-1">{uploadError}</div>
        </div>
      )}

      {/* Image Preview Window */}
      <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-ink-950/60 p-4 backdrop-blur-sm">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-inner">
          {displayImage && !imgError ? (
            <img
              src={displayImage}
              alt="Product Preview"
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-ink-600">
              <ImageIcon className="h-7 w-7" />
              <span className="mt-1 text-[10px]">No Image</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink-200">Image Preview</span>
            {displayImage && !imgError && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" />
                <span>Ready</span>
              </span>
            )}
          </div>

          {displayImage ? (
            imgError ? (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-error-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>Unable to load image from specified source</span>
              </div>
            ) : (
              <div className="mt-1 space-y-1">
                <p className="truncate font-mono text-[11px] text-ink-400" title={displayImage}>
                  {displayImage}
                </p>
                <p className="text-[10px] text-ink-500">
                  {localPreview
                    ? 'Image uploaded & preview ready for saving.'
                    : 'Image will display on the customer menu and admin list.'}
                </p>
              </div>
            )
          ) : (
            <div className="mt-1 text-[11px] text-ink-500">
              Enter an image URL or choose a file above to configure the product image.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
