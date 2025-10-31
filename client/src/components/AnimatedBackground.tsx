import { motion } from 'framer-motion';
import { useMemo } from 'react';

export default function AnimatedBackground() {
  const blobs = useMemo(
    () => [
      { x: -20, y: -10, size: 520, color: 'rgba(59,130,246,0.35)' },
      { x: 30, y: 10, size: 520, color: 'rgba(236,72,153,0.30)' },
      { x: 0, y: 30, size: 520, color: 'rgba(16,185,129,0.25)' },
    ],
    []
  );

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          initial={{ x: `${b.x}%`, y: `${b.y}%`, scale: 1 }}
          animate={{
            x: [ `${b.x}%`, `${b.x + 10}%`, `${b.x - 5}%`, `${b.x}%` ],
            y: [ `${b.y}%`, `${b.y - 10}%`, `${b.y + 5}%`, `${b.y}%` ],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{ duration: 18 + i * 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            width: b.size,
            height: b.size,
            filter: 'blur(80px)',
            background: `radial-gradient(50% 50% at 50% 50%, ${b.color} 0%, rgba(0,0,0,0) 70%)`,
          }}
        />
      ))}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(1000px 600px at 50% 0%, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0) 70%)' }} />
    </div>
  );
}


