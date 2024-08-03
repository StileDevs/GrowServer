import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ImagePulldownProps {
  className?: string;
  imageUrl: string;
  alt?: string;
  delay?: number;
}

export function ImagePulldown({ className, imageUrl, alt, delay }: ImagePulldownProps) {
  const pulldownVariant = {
    initial: { y: -100, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: {
        delay: delay ? delay : 0.05,
      },
    },
  };

  return (
    <div className="flex justify-center">
      <motion.img
        src={imageUrl}
        alt={alt}
        variants={pulldownVariant}
        initial="initial"
        animate="animate"
        className={cn("w-auto h-auto object-cover", className)}
      />
    </div>
  );
}