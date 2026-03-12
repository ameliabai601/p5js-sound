# Field — Mouse Instrument

A browser-based instrument controlled entirely by the mouse. Built with p5.js and the Web Audio API.

## How to use

- **Move mouse** — X axis controls pitch, Y axis controls filter brightness
- **Click and drag** — plays a continuous tone
- **Click** — triggers a short pluck sound
- **Scroll** — cycles through waveforms: sine, triangle, sawtooth, square

## How it works

- `sketch.js` contains the p5.js sketch and all Web Audio logic
- Mouse X position is mapped to a pentatonic scale (110–880 Hz)
- Mouse Y position controls a lowpass filter (bright at top, dark at bottom)
- Audio uses an oscillator routed through a filter and a convolver reverb

## Files

- `index.html` — page structure
- `style.css` — styles
- `sketch.js` — p5 sketch + Web Audio engine
