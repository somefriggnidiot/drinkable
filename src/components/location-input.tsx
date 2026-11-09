"use client";
import { useEffect, useId, useState } from "react";
import { Icon } from "./icon";
import styles from "./ui.module.css";
type Place = { label: string; latitude: number; longitude: number };
export function LocationInput({
  initial = "",
  lat,
  lng,
  placeholder,
}: {
  initial?: string;
  lat?: string;
  lng?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(initial);
  const [coordinates, setCoordinates] = useState<{
    lat: string;
    lng: string;
  } | null>(lat && lng ? { lat, lng } : null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [message, setMessage] = useState("");
  const id = useId();
  useEffect(() => {
    if (value.length < 3 || coordinates) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/geocode?q=${encodeURIComponent(value)}`, {
        signal: controller.signal,
      })
        .then(async (response) =>
          response.ok ? response.json() : { items: [] },
        )
        .then((data) => setPlaces(data.items))
        .catch(() => {});
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, coordinates]);
  function locate() {
    if (!navigator.geolocation) {
      setMessage("Location is unavailable. Enter a city or address.");
      return;
    }
    setMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: String(position.coords.latitude),
          lng: String(position.coords.longitude),
        });
        setValue("Current location");
        setPlaces([]);
        setMessage("");
      },
      () =>
        setMessage("Location access was unavailable. Enter a city or address."),
      { timeout: 8000, maximumAge: 60000 },
    );
  }
  return (
    <div className={styles.locationField}>
      <label
        htmlFor={id}
        className={placeholder ? "visuallyHidden" : undefined}
      >
        Location
      </label>
      <div className={styles.locationRow}>
        <input
          id={id}
          name="location"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setCoordinates(null);
            setPlaces([]);
          }}
          autoComplete="off"
          aria-controls={places.length ? `${id}-places` : undefined}
          maxLength={250}
        />
        <button
          type="button"
          className={styles.iconButton}
          onClick={locate}
          aria-label="Use my location"
        >
          <Icon name="pin" />
        </button>
      </div>
      {coordinates && (
        <>
          <input type="hidden" name="lat" value={coordinates.lat} />
          <input type="hidden" name="lng" value={coordinates.lng} />
        </>
      )}
      {places.length > 0 && (
        <ul id={`${id}-places`} className={styles.suggestions}>
          {places.map((place) => (
            <li key={place.label}>
              <button
                type="button"
                onClick={() => {
                  setValue(place.label);
                  setCoordinates({
                    lat: String(place.latitude),
                    lng: String(place.longitude),
                  });
                  setPlaces([]);
                }}
              >
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {message && <small role="status">{message}</small>}
    </div>
  );
}
