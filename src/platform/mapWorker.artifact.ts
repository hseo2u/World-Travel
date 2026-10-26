// The Claude artifact build is one HTML file, so the worker runs from a blob URL.
import source from 'maplibre-gl/dist/maplibre-gl-worker.mjs?raw'

export default URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
