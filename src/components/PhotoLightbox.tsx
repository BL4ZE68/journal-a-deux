import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';

interface PhotoLightboxProps {
  url: string;
  onClose: () => void;
}

export default function PhotoLightbox({ url, onClose }: PhotoLightboxProps) {
  const downloadPhoto = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `souvenir-${new Date().getTime()}.jpg`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Erreur download:', err);
      // Fallback simple si fetch échoue (CORS etc)
      window.open(url, '_blank');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-ink/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
        onClick={onClose}
      >
        <div className="absolute top-4 right-4 flex gap-4">
          <button
            onClick={(e) => { e.stopPropagation(); downloadPhoto(); }}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            aria-label="Télécharger"
          >
            <Download size={24} />
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            aria-label="Fermer"
          >
            <X size={24} />
          </button>
        </div>

        <motion.img
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          onDragEnd={(_, info) => {
            if (Math.abs(info.offset.y) > 100) onClose();
          }}
          src={url}
          alt=""
          className="max-w-full max-h-full rounded-lg shadow-2xl cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        />

        <p className="absolute bottom-8 text-white/40 text-xs font-medium uppercase tracking-widest">
          Glisser vers le bas pour fermer
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
