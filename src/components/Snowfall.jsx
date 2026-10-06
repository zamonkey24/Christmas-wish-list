import React, { useEffect, useRef } from 'react';

export default function Snowfall() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Create 45 subtle snowflakes
    const flakes = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2.5 + 1,
      d: Math.random() * 1 + 0.3,
      opacity: Math.random() * 0.5 + 0.2,
      sway: Math.random() * 0.02
    }));

    let animId;
    let angle = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      angle += 0.01;

      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${f.opacity})`;
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2, false);
        ctx.fill();

        // Update positions
        f.y += f.d;
        f.x += Math.sin(angle + i) * f.sway;

        // Reset if flake hits bottom or edges
        if (f.y > height) {
          flakes[i] = {
            x: Math.random() * width,
            y: -10,
            r: f.r,
            d: f.d,
            opacity: f.opacity,
            sway: f.sway
          };
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="snowfall-container"
    />
  );
}
