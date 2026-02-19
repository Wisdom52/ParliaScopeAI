import React, { useEffect, useRef } from 'react';

declare const L: any;

interface MapModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectLocation: (lat: number, lng: number) => void;
    initialLocation?: { lat: number; lng: number };
}

export const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose, onSelectLocation, initialLocation }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markerInstance = useRef<any>(null);

    // Kenya Bounds
    const kenyaBounds = [
        [-4.7, 33.9], // Southwest
        [5.0, 41.9]   // Northeast
    ];

    useEffect(() => {
        if (isOpen && mapRef.current && !mapInstance.current) {
            // Wait for Leaflet to be available
            if (typeof L === 'undefined') {
                console.error("Leaflet not loaded");
                return;
            }

            const initialLat = initialLocation?.lat || 1.2921;
            const initialLng = initialLocation?.lng || 36.8219;

            mapInstance.current = L.map(mapRef.current, {
                center: [initialLat, initialLng],
                zoom: 6,
                maxBounds: kenyaBounds,
                maxBoundsViscosity: 1.0
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(mapInstance.current);

            markerInstance.current = L.marker([initialLat, initialLng], { draggable: true }).addTo(mapInstance.current);

            mapInstance.current.on('click', (e: any) => {
                const { lat, lng } = e.latlng;
                markerInstance.current.setLatLng([lat, lng]);
            });

            markerInstance.current.on('dragend', (e: any) => {
                const { lat, lng } = e.target.getLatLng();
            });
        }

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [isOpen]);

    const handleConfirm = () => {
        if (markerInstance.current) {
            const { lat, lng } = markerInstance.current.getLatLng();
            onSelectLocation(lat, lng);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                width: '90%',
                maxWidth: '600px',
                height: '70vh',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <h3 style={{ marginTop: 0 }}>Select Location (Kenya Only)</h3>
                <div ref={mapRef} style={{ flex: 1, width: '100%', borderRadius: '8px', overflow: 'hidden' }}></div>
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ccc', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleConfirm} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}>Confirm Selection</button>
                </div>
            </div>
        </div>
    );
};
