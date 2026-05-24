import { useEffect, useState } from "react";

export function useWindowVisibility() {
  const [isVisible, setIsVisible] = useState(() =>
    typeof document !== "undefined"
      ? document.visibilityState === "visible"
      : true,
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible");
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return isVisible;
}
