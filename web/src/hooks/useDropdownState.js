import { useState } from "react";

export function useDropdownState(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  return {
    isOpen,
    setIsOpen,
    open,
    close,
    toggle,
  };
}
