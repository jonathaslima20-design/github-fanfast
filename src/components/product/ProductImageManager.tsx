import { useState } from 'react';
import { Upload, X, Star, Image as ImageIcon, Scissors, Video, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageCropperProduct } from '@/components/ui/image-cropper-product';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { extractYouTubeVideoId, getYouTubeEmbedUrl, getYouTubeThumbnailUrl, isValidYouTubeUrl } from '@/utils/youtubeUtils';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type MediaItem = {
  id: string;
  url: string;
  file?: File;
  isFeatured: boolean;
  mediaType: 'image' | 'video';
  videoId?: string;
};

interface ProductImageManagerProps {
  images: MediaItem[];
  onChange: (images: MediaItem[]) => void;
  maxImages?: number;
  maxFileSize?: number;
}

export function ProductImageManager({
  images,
  onChange,
  maxImages = 10,
  maxFileSize = 5
}: ProductImageManagerProps) {
  const [dragOver, setDragOver] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [imageToRecrop, setImageToRecrop] = useState<MediaItem | null>(null);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const remainingSlots = maxImages - images.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    if (filesToAdd.length === 0) {
      toast.error('Limite máximo de imagens atingido');
      return;
    }

    const validFiles = filesToAdd.filter(file => {
      if (file.size > maxFileSize * 1024 * 1024) {
        toast.error(`${file.name} excede o tamanho máximo de ${maxFileSize}MB`);
        return false;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} não é uma imagem válida`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setPendingFiles(validFiles);
      setCurrentFileIndex(0);
      setSelectedFile(validFiles[0]);
      setShowCropper(true);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (imageToRecrop) {
      const croppedFile = new File([croppedBlob], `recropped-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });

      const updatedImages = images.map(img =>
        img.id === imageToRecrop.id
          ? { ...img, url: URL.createObjectURL(croppedFile), file: croppedFile }
          : img
      );

      onChange(updatedImages);
      setShowCropper(false);
      setImageToRecrop(null);
      toast.success('Imagem recortada com sucesso');
      return;
    }

    if (!selectedFile) return;

    const croppedFile = new File([croppedBlob], selectedFile.name, {
      type: 'image/jpeg',
    });

    const newImage: MediaItem = {
      id: `new-${Date.now()}-${currentFileIndex}`,
      url: URL.createObjectURL(croppedFile),
      file: croppedFile,
      isFeatured: images.length === 0 && currentFileIndex === 0,
      mediaType: 'image'
    };

    onChange([...images, newImage]);

    if (currentFileIndex < pendingFiles.length - 1) {
      const nextIndex = currentFileIndex + 1;
      setCurrentFileIndex(nextIndex);
      setSelectedFile(pendingFiles[nextIndex]);
    } else {
      setShowCropper(false);
      setSelectedFile(null);
      setPendingFiles([]);
      setCurrentFileIndex(0);
      toast.success(`${pendingFiles.length} imagem(ns) adicionada(s) com sucesso`);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setSelectedFile(null);
    setPendingFiles([]);
    setCurrentFileIndex(0);
    setImageToRecrop(null);
  };

  const handleRecropImage = (image: MediaItem) => {
    if (image.mediaType === 'video') return;
    setImageToRecrop(image);
    setShowCropper(true);
  };

  const handleAddVideo = () => {
    if (!youtubeUrl.trim()) {
      toast.error('Por favor, insira um link do YouTube');
      return;
    }

    if (!isValidYouTubeUrl(youtubeUrl)) {
      toast.error('Link do YouTube inválido');
      return;
    }

    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      toast.error('Não foi possível extrair o ID do vídeo');
      return;
    }

    const newVideo: MediaItem = {
      id: `video-${Date.now()}`,
      url: getYouTubeEmbedUrl(videoId),
      isFeatured: images.length === 0,
      mediaType: 'video',
      videoId
    };

    onChange([...images, newVideo]);
    setYoutubeUrl('');
    setShowVideoDialog(false);
    toast.success('Vídeo adicionado com sucesso');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const setFeaturedImage = (imageId: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      isFeatured: img.id === imageId
    }));
    onChange(updatedImages);
  };

  const removeImage = (imageId: string) => {
    const imageToRemove = images.find(img => img.id === imageId);
    const remainingImages = images.filter(img => img.id !== imageId);

    if (imageToRemove?.isFeatured && remainingImages.length > 0) {
      remainingImages[0].isFeatured = true;
    }

    onChange(remainingImages);
  };

  const remainingSlots = maxImages - images.length;

  return (
    <>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Mídia do Produto</h3>
          <p className="text-sm text-muted-foreground">
            Adicione até {maxImages} imagens e vídeos. Imagens serão cortadas em proporção quadrada (1:1).
          </p>
        </div>

        {images.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Mídia Atual</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((item) => (
                <div
                  key={item.id}
                  className="relative group aspect-square rounded-lg overflow-hidden bg-muted border-2 transition-all"
                >
                  {item.mediaType === 'video' ? (
                    <div className="relative w-full h-full">
                      <img
                        src={getYouTubeThumbnailUrl(item.videoId!)}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Video className="h-12 w-12 text-white" />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={item.url}
                      alt="Product"
                      className="w-full h-full object-cover"
                    />
                  )}

                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant={item.isFeatured ? "default" : "secondary"}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setFeaturedImage(item.id)}
                      title={item.isFeatured ? "Mídia principal" : "Definir como principal"}
                    >
                      <Star className={cn(
                        "h-4 w-4",
                        item.isFeatured && "fill-current"
                      )} />
                    </Button>
                    {item.mediaType === 'image' && (
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRecropImage(item)}
                        title="Recortar imagem"
                      >
                        <Scissors className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(item.id)}
                      title={item.mediaType === 'video' ? "Remover vídeo" : "Remover imagem"}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {item.isFeatured && (
                    <div className="absolute bottom-2 left-2">
                      <span className="bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded">
                        Principal
                      </span>
                    </div>
                  )}
                  {item.mediaType === 'video' && (
                    <div className="absolute bottom-2 right-2">
                      <span className="bg-red-600 text-white text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
                        <Video className="h-3 w-3" />
                        Vídeo
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {remainingSlots > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">
              Adicionar Nova Mídia ({remainingSlots} restantes)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  "relative border-2 border-dashed rounded-lg p-6 transition-colors",
                  dragOver ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <input
                  type="file"
                  id="image-upload"
                  className="hidden"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <div className="rounded-full bg-primary/10 p-4 mb-3">
                    <Scissors className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-center mb-1">
                    Upload de Imagens
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    PNG, JPG ou WEBP (MÁX. {maxFileSize}MB)
                  </p>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Clique ou arraste
                  </p>
                </label>
              </div>

              <div className="border-2 border-dashed rounded-lg p-6 border-border">
                <div className="flex flex-col items-center justify-center">
                  <div className="rounded-full bg-red-600/10 p-4 mb-3">
                    <Video className="h-6 w-6 text-red-600" />
                  </div>
                  <p className="text-sm font-medium text-center mb-1">
                    Adicionar Vídeo do YouTube
                  </p>
                  <p className="text-xs text-muted-foreground text-center mb-3">
                    Cole o link do YouTube
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVideoDialog(true)}
                    className="w-full"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Adicionar Link
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {images.length === 0 && (
          <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg border border-dashed">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma mídia adicionada ainda. Adicione pelo menos uma imagem ou vídeo do produto.
            </p>
          </div>
        )}
      </div>

      {(selectedFile || imageToRecrop) && (
        <ImageCropperProduct
          image={imageToRecrop ? imageToRecrop.url : URL.createObjectURL(selectedFile!)}
          onCrop={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1}
          open={showCropper}
        />
      )}

      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Vídeo do YouTube</DialogTitle>
            <DialogDescription>
              Cole o link do vídeo do YouTube que você deseja adicionar ao produto.
              O vídeo será exibido na galeria junto com as imagens.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="youtube-url" className="text-sm font-medium">
                Link do YouTube
              </label>
              <Input
                id="youtube-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddVideo();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Formatos aceitos: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowVideoDialog(false);
                setYoutubeUrl('');
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleAddVideo}>
              Adicionar Vídeo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
