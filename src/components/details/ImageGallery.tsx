import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { PlayCircle, X, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'photoswipe/dist/photoswipe.css';
import { Gallery, Item } from 'react-photoswipe-gallery';
import { getYouTubeThumbnailUrl } from '@/utils/youtubeUtils';
import type { ProductImage } from '@/types';

interface ImageGalleryProps {
  media: ProductImage[];
  title: string;
}

interface ImageDimensions {
  width: number;
  height: number;
}

export default function ImageGallery({ media, title }: ImageGalleryProps) {
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [currentMainIndex, setCurrentMainIndex] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions[]>([]);
  const galleryRefs = useRef<(() => void)[]>([]);

  const imageItems = media.filter(item => item.media_type !== 'video');
  const videoItems = media.filter(item => item.media_type === 'video');

  useEffect(() => {
    const loadImageDimensions = async () => {
      const dimensions = await Promise.all(
        imageItems.map((item) => {
          return new Promise<ImageDimensions>((resolve) => {
            const img = new Image();
            img.onload = () => {
              resolve({
                width: img.naturalWidth,
                height: img.naturalHeight,
              });
            };
            img.onerror = () => {
              resolve({
                width: 1000,
                height: 1000,
              });
            };
            img.src = item.url;
          });
        })
      );
      setImageDimensions(dimensions);
    };

    if (imageItems.length > 0) {
      loadImageDimensions();
    }
  }, [media]);

  const handleMainClick = () => {
    const currentItem = media[currentMainIndex];
    if (currentItem.media_type === 'video') {
      setSelectedVideoUrl(currentItem.url);
    } else {
      const imageIndex = imageItems.findIndex(img => img.id === currentItem.id);
      if (galleryRefs.current[imageIndex]) {
        galleryRefs.current[imageIndex]();
      }
    }
  };

  const currentMainItem = media[currentMainIndex];

  return (
    <>
      <div className="mb-8">
        <Gallery>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 mb-4">
              <motion.div
                onClick={handleMainClick}
                className="cursor-pointer aspect-square overflow-hidden rounded-lg relative"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                {currentMainItem.media_type === 'video' ? (
                  <>
                    <img
                      src={getYouTubeThumbnailUrl(currentMainItem.url.split('/').pop()!)}
                      alt={`${title} - Vídeo`}
                      className="w-full h-full object-cover"
                      loading="eager"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="text-center">
                        <Video className="h-20 w-20 text-white mx-auto mb-2" />
                        <p className="text-white text-sm font-medium">Clique para assistir</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <img
                    src={currentMainItem.url}
                    alt={`${title} - Imagem principal`}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                )}
              </motion.div>
            </div>

            {imageItems.map((image, index) => (
              <div key={image.id} className="col-span-3">
                {imageDimensions[index] && (
                  <Item
                    original={image.url}
                    thumbnail={image.url}
                    width={imageDimensions[index].width.toString()}
                    height={imageDimensions[index].height.toString()}
                  >
                    {({ ref, open }) => {
                      galleryRefs.current[index] = open;
                      const mediaIndex = media.findIndex(m => m.id === image.id);

                      return (
                        <motion.div
                          ref={ref as any}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentMainIndex(mediaIndex);
                          }}
                          onDoubleClick={open}
                          className={`cursor-pointer aspect-[4/3] overflow-hidden rounded-lg border-2 transition-all ${
                            currentMainIndex === mediaIndex
                              ? 'border-primary shadow-md'
                              : 'border-transparent hover:border-primary/50'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.2 }}
                        >
                          <img
                            src={image.url}
                            alt={`${title} - Imagem ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </motion.div>
                      );
                    }}
                  </Item>
                )}
              </div>
            ))}

            {videoItems.map((video) => {
              const videoId = video.url.split('/').pop()!;
              const mediaIndex = media.findIndex(m => m.id === video.id);

              return (
                <div key={video.id} className="col-span-3">
                  <motion.div
                    className={`cursor-pointer aspect-[4/3] overflow-hidden rounded-lg relative border-2 transition-all ${
                      currentMainIndex === mediaIndex
                        ? 'border-primary shadow-md'
                        : 'border-transparent hover:border-primary/50'
                    }`}
                    onClick={() => setCurrentMainIndex(mediaIndex)}
                    onDoubleClick={() => setSelectedVideoUrl(video.url)}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <img
                      src={getYouTubeThumbnailUrl(videoId)}
                      alt="Video thumbnail"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <PlayCircle className="h-10 w-10 text-white" />
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </Gallery>
      </div>

      {selectedVideoUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 text-white hover:text-white/80"
              onClick={() => setSelectedVideoUrl(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            <iframe
              src={`${selectedVideoUrl}?autoplay=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </>
  );
}