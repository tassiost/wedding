import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number; // ms before auto-hide, default 3000
}

export default function Toast({ message, visible, onHide, duration = 3000 }: ToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onHide, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide, duration]);

  if (!visible && !show) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-[2000] px-6 py-3 rounded-full font-medium text-sm bg-[#2c2c2c] text-white whitespace-nowrap transition-all duration-300 ${
        show
          ? '-translate-x-1/2 translate-y-0 opacity-100'
          : '-translate-x-1/2 translate-y-[100px] opacity-0'
      }`}
    >
      {message}
    </div>
  );
}
