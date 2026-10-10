import React from 'react';

const DiagonalPattern: React.FC<{ className?: string; dark?: boolean }> = ({ className = '', dark = false }) => (
  <div
    aria-hidden="true"
    className={`diagonal-pattern ${dark ? 'diagonal-pattern-dark' : ''} ${className}`}
  />
);

export default DiagonalPattern;
