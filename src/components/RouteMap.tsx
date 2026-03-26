import { useEffect } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import type { LatLng, RankedStation } from '../types';

interface Props {
  polyline: LatLng[];
  topStations: RankedStation[];
  destination: LatLng | null;
}

function PolylineOverlay({ polyline }: { polyline: LatLng[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || polyline.length === 0) return;

    const routeLine = new google.maps.Polyline({
      path: polyline,
      strokeColor: '#0d9488',
      strokeOpacity: 1.0,
      strokeWeight: 4,
      map,
    });

    // Fit the map to the route
    const bounds = new google.maps.LatLngBounds();
    polyline.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });

    return () => routeLine.setMap(null);
  }, [map, polyline]);

  return null;
}

function MarkerEmoji({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div
      title={label}
      className="flex items-center justify-center w-9 h-9 rounded-full bg-ink-800 shadow-md border-2 border-ink-600 text-xl leading-none select-none"
    >
      {emoji}
    </div>
  );
}

// Melbourne CBD as default center while loading
const DEFAULT_CENTER = { lat: -37.814, lng: 144.963 };

export function RouteMap({ polyline, topStations, destination }: Props) {
  return (
    <Map
      style={{ width: '100%', height: '100%' }}
      defaultCenter={DEFAULT_CENTER}
      defaultZoom={11}
      mapId="DEMO_MAP_ID"
      gestureHandling="cooperative"
      disableDefaultUI={true}
      clickableIcons={false}
    >
      <PolylineOverlay polyline={polyline} />

      {/* Destination pin */}
      {destination && (
        <AdvancedMarker position={destination} zIndex={10}>
          <MarkerEmoji emoji="📍" label="Destination" />
        </AdvancedMarker>
      )}

      {/* Station pins — recommended station is highlighted */}
      {topStations.map((station, i) => (
        <AdvancedMarker
          key={station.site_id}
          position={{ lat: station.latitude, lng: station.longitude }}
          zIndex={topStations.length - i}
        >
          <div
            title={`${station.name} — ${station.selectedFuelPrice}¢/L`}
            className={`flex items-center justify-center rounded-full shadow-md border-2 text-xl leading-none select-none ${
              i === 0
                ? 'w-11 h-11 bg-amber-500 border-ink-900 text-white'
                : 'w-9 h-9 bg-ink-800 border-ink-600'
            }`}
          >
            ⛽
          </div>
        </AdvancedMarker>
      ))}
    </Map>
  );
}
