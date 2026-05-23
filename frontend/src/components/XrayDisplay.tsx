import { motion, AnimatePresence } from "framer-motion";

interface Props {
  imageBase64: string | null;
  loading?: boolean;
  size?: "md" | "lg";
  alt?: string;
}

export default function XrayDisplay({ imageBase64, loading = false, size = "md", alt = "Chest X-Ray" }: Props) {
  const dims = size === "lg" ? "w-full aspect-square max-w-md" : "w-full aspect-square max-w-xs";

  return (
    <div className={`relative ${dims} mx-auto`}>
      {/* Scanline overlay for clinical aesthetic */}
      <div
        className="absolute inset-0 z-10 pointer-events-none rounded-lg opacity-[0.03]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.5) 2px, rgba(0,212,255,0.5) 3px)",
        }}
      />

      {loading ? (
        <div className={`${dims} rounded-lg bg-surface border border-border animate-pulse flex items-center justify-center`}>
          <div className="flex flex-col items-center gap-3 text-text-secondary">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono">Generating...</span>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {imageBase64 ? (
            <motion.div
              key={imageBase64.slice(-20)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full h-full"
            >
              <img
                src={`data:image/png;base64,${imageBase64}`}
                alt={alt}
                className="xray-image w-full h-full object-contain rounded-lg"
                style={{ filter: "brightness(1.1) contrast(1.1)" }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-full rounded-lg bg-surface border border-border border-dashed flex items-center justify-center"
            >
              <div className="text-center text-text-secondary">
                <div className="text-4xl mb-2 opacity-30">⬛</div>
                <p className="text-xs font-mono">No image generated</p>
                <p className="text-xs mt-1 opacity-60">Adjust the slider to generate</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
