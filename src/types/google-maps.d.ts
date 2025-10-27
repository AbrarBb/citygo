/// <reference types="google.maps" />

declare global {
  interface Window {
    google: typeof google;
  }
  
  const google: typeof google;
}

export {};
