import React, { useEffect } from 'react';

const Stars = () => {
  useEffect(() => {
    const starsContainer = document.getElementById('stars');
    if (!starsContainer) return;

    // Clear existing stars
    starsContainer.innerHTML = '';

    // Create stars
    for (let i = 0; i < 120; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      const size = Math.random() * 2.5 + 0.5;
      star.style.cssText = `
        left: ${Math.random() * 100}%; 
        top: ${Math.random() * 100}%;
        width: ${size}px; 
        height: ${size}px;
        --d: ${(Math.random() * 4 + 2).toFixed(1)}s;
        --delay: ${(Math.random() * 5).toFixed(1)}s;
        --op: ${(Math.random() * 0.7 + 0.2).toFixed(1)};
      `;
      starsContainer.appendChild(star);
    }

    return () => {
      starsContainer.innerHTML = '';
    };
  }, []);

  return <div className="stars" id="stars" />;
};

export default Stars;
