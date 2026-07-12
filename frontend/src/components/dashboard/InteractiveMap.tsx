import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

interface InteractiveMapProps {
  polyline: string | null
  sourceName?: string
  destinationName?: string
}

// Global flag to track CDN injection
let leafletAssetsInjected = false

export default function InteractiveMap({ polyline, sourceName = "Source", destinationName = "Destination" }: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [leafletLoaded, setLeafletLoaded] = useState(!!(window as any).L)
  const [loading, setLoading] = useState(true)

  // 1. Inject Leaflet CDN files dynamically
  useEffect(() => {
    if ((window as any).L) {
      setLeafletLoaded(true)
      setLoading(false)
      return
    }

    if (leafletAssetsInjected) {
      // Check periodically for L
      const checkInterval = setInterval(() => {
        if ((window as any).L) {
          setLeafletLoaded(true)
          setLoading(false)
          clearInterval(checkInterval)
        }
      }, 100)
      return () => clearInterval(checkInterval)
    }

    leafletAssetsInjected = true
    setLoading(true)

    // CSS
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    link.crossOrigin = ""
    document.head.appendChild(link)

    // JS
    const script = document.createElement("script")
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    script.crossOrigin = ""
    script.onload = () => {
      setLeafletLoaded(true)
      setLoading(false)
    }
    document.body.appendChild(script)
  }, [])

  // 2. Decode Google-encoded Polyline
  const decodePolyline = (encoded: string): [number, number][] => {
    const points: [number, number][] = []
    let index = 0, len = encoded.length
    let lat = 0, lng = 0
    while (index < len) {
      let b, shift = 0, result = 0
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1))
      lat += dlat
      shift = 0
      result = 0
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1))
      lng += dlng
      points.push([lat / 1e5, lng / 1e5])
    }
    return points
  }

  // 3. Initialize/update map and layers
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return

    const L = (window as any).L
    if (!L) return

    // If map does not exist, initialize it
    if (!mapInstanceRef.current) {
      // Default center is India Center
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([20.5937, 78.9629], 5)

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(mapInstanceRef.current)
    }

    const map = mapInstanceRef.current

    // Clear previous layers/markers (keep tile layer)
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Polyline || layer instanceof L.Marker) {
        map.removeLayer(layer)
      }
    })

    if (polyline) {
      try {
        const coords = decodePolyline(polyline)
        if (coords.length > 0) {
          // Draw polyline path
          const polylineLayer = L.polyline(coords, {
            color: "#0080FF",
            weight: 5,
            opacity: 0.8,
          }).addTo(map)

          // Add Markers
          const start = coords[0]
          const end = coords[coords.length - 1]

          // Start marker
          L.marker(start, {
            title: sourceName,
          })
            .addTo(map)
            .bindPopup(`<b>Start:</b> ${sourceName}`)
            .openPopup()

          // End marker
          L.marker(end, {
            title: destinationName,
          })
            .addTo(map)
            .bindPopup(`<b>Destination:</b> ${destinationName}`)

          // Fit bounds
          map.fitBounds(polylineLayer.getBounds(), { padding: [40, 40] })
        }
      } catch (e) {
        console.error("Failed to decode or draw polyline", e)
      }
    } else {
      // Reset view to default zoom out
      map.setView([20.5937, 78.9629], 5)
    }
  }, [leafletLoaded, polyline, sourceName, destinationName])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  return (
    <div className="relative h-full w-full min-h-[300px] overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-50/80 text-zinc-500 dark:bg-zinc-900/80">
          <Loader2 className="size-6 animate-spin text-[#0080FF]" />
          <p className="mt-2 text-xs">Loading map engine...</p>
        </div>
      )}
      <div ref={mapContainerRef} className="h-full w-full" style={{ zIndex: 1 }} />
    </div>
  )
}
