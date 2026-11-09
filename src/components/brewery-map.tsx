"use client";
import { useEffect, useRef, useState } from "react";
import type {
  Map as LibreMap,
  GeoJSONSource,
  MapLayerMouseEvent,
} from "maplibre-gl";
import type { SearchResult } from "@/domain/search";
import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./ui.module.css";
type Marker = SearchResult["markers"][number];
function featureData(markers: Marker[]) {
  return {
    type: "FeatureCollection" as const,
    features: markers.map((m) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [m.longitude, m.latitude],
      },
      properties: { id: m.id, name: m.name, slug: m.slug },
    })),
  };
}
function frameResults(map: LibreMap, markers: Marker[], selectedId?: string) {
  const selected = markers.find((m) => m.id === selectedId);
  if (selected || markers.length === 1) {
    const m = selected || markers[0];
    map.jumpTo({ center: [m.longitude, m.latitude], zoom: 14 });
    return;
  }
  if (markers.length > 1) {
    const lngs = markers.map((m) => m.longitude),
      lats = markers.map((m) => m.latitude);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 60, maxZoom: 13, duration: 0 },
    );
  }
}
export function BreweryMap({
  markers,
  onBounds,
  selectedId,
  fitToResults = true,
}: {
  markers: Marker[];
  onBounds?: (bounds: string) => void;
  selectedId?: string;
  fitToResults?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const latest = useRef({ markers, onBounds, selectedId, fitToResults });
  const [failure, setFailure] = useState("");
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  useEffect(() => {
    latest.current = { markers, onBounds, selectedId, fitToResults };
    const map = mapRef.current;
    const source = map?.getSource("breweries") as GeoJSONSource | undefined;
    if (source) {
      source.setData(featureData(markers));
      if (fitToResults) frameResults(map!, markers, selectedId);
    }
  }, [markers, onBounds, selectedId, fitToResults]);
  useEffect(() => {
    if (!key) return;
    let disposed = false;
    import("maplibre-gl")
      .then((lib) => {
        if (disposed || !container.current) return;
        try {
          const map = new lib.Map({
            container: container.current,
            style: `https://api.maptiler.com/maps/dataviz-light/style.json?key=${key}`,
            center: [-94.5786, 39.0997],
            zoom: 8,
            attributionControl: { compact: true },
          });
          mapRef.current = map;
          map.addControl(new lib.NavigationControl(), "top-right");
          map.addControl(new lib.FullscreenControl(), "top-right");
          map.addControl(
            new lib.GeolocateControl({
              positionOptions: { enableHighAccuracy: true },
              trackUserLocation: false,
            }),
            "bottom-right",
          );
          map.on("error", () =>
            setFailure(
              "The map could not load. You can continue using the brewery list.",
            ),
          );
          map.on("load", () => {
            if (disposed) return;
            map.addSource("breweries", {
              type: "geojson",
              data: featureData(latest.current.markers),
              cluster: true,
              clusterMaxZoom: 13,
              clusterRadius: 45,
            });
            map.addLayer({
              id: "clusters",
              type: "circle",
              source: "breweries",
              filter: ["has", "point_count"],
              paint: {
                "circle-color": "#111820",
                "circle-radius": 18,
                "circle-stroke-color": "#fff",
                "circle-stroke-width": 2,
              },
            });
            map.addLayer({
              id: "cluster-count",
              type: "symbol",
              source: "breweries",
              filter: ["has", "point_count"],
              layout: {
                "text-field": ["get", "point_count_abbreviated"],
                "text-size": 13,
              },
              paint: { "text-color": "#fff" },
            });
            map.addLayer({
              id: "brewery-points",
              type: "circle",
              source: "breweries",
              filter: ["!", ["has", "point_count"]],
              paint: {
                "circle-color": "#202125",
                "circle-radius": 12,
                "circle-stroke-color": "#fff",
                "circle-stroke-width": 2,
              },
            });
            frameResults(
              map,
              latest.current.markers,
              latest.current.selectedId,
            );
          });
          map.on("click", "clusters", async (event: MapLayerMouseEvent) => {
            const feature = event.features?.[0];
            if (!feature) return;
            try {
              const source = map.getSource("breweries") as GeoJSONSource;
              const zoom = await source.getClusterExpansionZoom(
                Number(feature.properties.cluster_id),
              );
              if (!disposed && feature.geometry.type === "Point")
                map.easeTo({
                  center: feature.geometry.coordinates as [number, number],
                  zoom,
                });
            } catch {}
          });
          map.on("click", "brewery-points", (event: MapLayerMouseEvent) => {
            const feature = event.features?.[0];
            if (!feature || feature.geometry.type !== "Point") return;
            const content = document.createElement("a");
            content.href = `/listing/${encodeURIComponent(feature.properties.slug)}/`;
            content.textContent = feature.properties.name;
            content.style.cssText =
              "display:block;padding:8px;font:600 14px Roboto;color:#242429";
            new lib.Popup()
              .setLngLat(feature.geometry.coordinates as [number, number])
              .setDOMContent(content)
              .addTo(map);
          });
          for (const layer of ["clusters", "brewery-points"]) {
            map.on("mouseenter", layer, () => {
              map.getCanvas().style.cursor = "pointer";
            });
            map.on("mouseleave", layer, () => {
              map.getCanvas().style.cursor = "";
            });
          }
          map.on("moveend", (event) => {
            if (!event.originalEvent) return;
            const b = map.getBounds();
            latest.current.onBounds?.(
              [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]
                .map((n) => n.toFixed(5))
                .join(","),
            );
          });
        } catch {
          setFailure(
            "This browser cannot display the map. Use the brewery list instead.",
          );
        }
      })
      .catch(() =>
        setFailure("The map is unavailable. Use the brewery list instead."),
      );
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [key]);
  return (
    <div className={styles.mapContainer}>
      <div
        ref={container}
        className={styles.mapCanvas}
        role="region"
        aria-label="Brewery locations map"
      />
      {(!key || failure) && (
        <div className={styles.mapUnavailable}>
          <h2>Explore brewery locations</h2>
          <p>
            {failure ||
              "The interactive map is not configured yet. Browse all matching breweries in the list."}
          </p>
          {markers.length > 0 && (
            <p>
              {markers.length} {markers.length === 1 ? "brewery" : "breweries"}{" "}
              found
            </p>
          )}
        </div>
      )}
    </div>
  );
}
