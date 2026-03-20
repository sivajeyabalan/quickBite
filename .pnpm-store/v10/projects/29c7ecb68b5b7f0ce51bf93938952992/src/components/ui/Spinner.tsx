import { useEffect, useRef } from 'react';
import { DotLottie } from '@lottiefiles/dotlottie-web';

function FullScreenLottieSpinner() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const player = new DotLottie({
      canvas: canvasRef.current,
      src: 'https://lottie.host/d475700a-7ad1-4a0b-b052-d90c39ad3fc4/PJiq9vWivc.lottie',
      autoplay: true,
      loop: true,
      renderConfig: {
        autoResize: true,
      },
    });

    return () => {
      player.destroy();
    };
  }, []);

  return (
    <div className="flex justify-center items-center">
      <canvas ref={canvasRef} className="h-96 w-96" />
    </div>
  );
}

export default function Spinner({ size = 'md' }: { size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const sizes = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  if (size === 'lg') {
    return <FullScreenLottieSpinner />;
  }

  return (
    <div className="flex justify-center items-center">
      <div className={`${sizes[size]} animate-spin rounded-full border-4 border-gray-200 border-t-orange-500`} />
    </div>
  );
}

