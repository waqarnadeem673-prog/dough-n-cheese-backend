import { useState, useEffect } from 'react';

export function useOpenNow(openTime: string, closeTime: string): boolean {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const pkHour = parseInt(
        now.toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi', hour: '2-digit', hour12: false }),
      10,
      );
      const pkMin = parseInt(
        now.toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi', minute: '2-digit' }),
        10,
      );
      const currentMin = pkHour * 60 + pkMin;

      const [oh, om] = openTime.split(':').map(Number);
      const [ch, cm] = closeTime.split(':').map(Number);
      const openMin = oh * 60 + om;
      const closeMin = ch * 60 + cm;

      if (closeMin <= openMin) {
        setOpen(currentMin >= openMin || currentMin < closeMin);
      } else {
        setOpen(currentMin >= openMin && currentMin < closeMin);
      }
    };

    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [openTime, closeTime]);

  return open;
}
