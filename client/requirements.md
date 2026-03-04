## Packages
leaflet | Core map rendering library
react-leaflet | React bindings for Leaflet maps
@types/leaflet | TypeScript definitions for Leaflet
date-fns | Robust date formatting and parsing

## Notes
- Leaflet requires its CSS to be imported for correct map tile and control rendering. This is included via CDN in index.css.
- Map tiles use CartoDB Dark Matter to match the dashboard's professional dark mode aesthetic.
- The audio notification uses the native Web Audio API (`AudioContext`) to synthesize a subtle beep, avoiding external asset dependencies.
