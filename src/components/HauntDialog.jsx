import { useEffect, useRef } from "react";

export default function HauntDialog({
  children,
  onClose,
  labelId,
  className = "",
  closeOnBackdrop = true,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      queueMicrotask(() => { if (trigger?.isConnected) trigger.focus({ preventScroll: true }); });
    };
  }, []);
  return <dialog ref={ref} className={className} aria-labelledby={labelId} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (closeOnBackdrop && event.target === event.currentTarget) onClose(); }}>{children}</dialog>;
}
