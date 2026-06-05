import { useEffect, useMemo, useState } from "react";

interface ClockProps {
  showSeconds?: boolean;
  hourFormat?: "12" | "24";
}

export default function Clock({
  showSeconds = false,
  hourFormat = "24",
}: ClockProps) {
  const [time, setTime] = useState(new Date());

  const formatter = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: showSeconds ? "2-digit" : undefined,
      hour12: hourFormat === "12",
    });
  }, [showSeconds, hourFormat]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <p className="font-mono">{formatter.format(time)}</p>
    </div>
  );
}
