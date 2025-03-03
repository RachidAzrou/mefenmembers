import * as React from "react";

export const SufufIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M4 21V10.5c0-1.1.9-2 2-2h1.5v-2c0-1.1.9-2 2-2h5c1.1 0 2 .9 2 2v2H18c1.1 0 2 .9 2 2V21h-3v-2c0-.55-.45-1-1-1h-4c-.55 0-1 .45-1 1v2H4zm8-11.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM6 19h12v-7H6v7z"/>
    <path d="M4 5.5c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v1c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2v-1z"/>
  </svg>
);