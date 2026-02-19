import React from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

interface MapModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectLocation: (lat: number, lng: number) => void;
    initialLocation?: { lat: number; lng: number };
}

export const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose, onSelectLocation, initialLocation }) => {
    const initialLat = initialLocation?.lat || 1.2921;
    const initialLng = initialLocation?.lng || 36.8219;

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <style>
                body { margin: 0; padding: 0; }
                #map { height: 100vh; width: 100vw; }
                .confirm-btn {
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 1000;
                    background: #007AFF;
                    color: white;
                    padding: 12px 24px;
                    border-radius: 25px;
                    font-family: sans-serif;
                    font-weight: bold;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <div class="confirm-btn" onclick="confirm()">Confirm Selection</div>
            <script>
                const kenyaBounds = [[-4.7, 33.9], [5.0, 41.9]];
                const map = L.map('map', {
                    center: [${initialLat}, ${initialLng}],
                    zoom: 7,
                    maxBounds: kenyaBounds,
                    maxBoundsViscosity: 1.0
                });

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap'
                }).addTo(map);

                let marker = L.marker([${initialLat}, ${initialLng}], { draggable: true }).addTo(map);

                map.on('click', function(e) {
                    marker.setLatLng(e.latlng);
                });

                function confirm() {
                    const pos = marker.getLatLng();
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        lat: pos.lat,
                        lng: pos.lng
                    }));
                }
            </script>
        </body>
        </html>
    `;

    const onMessage = (event: any) => {
        const data = JSON.parse(event.nativeEvent.data);
        onSelectLocation(data.lat, data.lng);
        onClose();
    };

    return (
        <Modal visible={isOpen} animationType="slide" transparent={false}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Pick Location (Kenya)</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.closeText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
                <WebView
                    source={{ html: htmlContent }}
                    onMessage={onMessage}
                    style={{ flex: 1 }}
                />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingTop: 10
    },
    title: { fontSize: 18, fontWeight: 'bold' },
    closeText: { color: '#007AFF', fontSize: 16 }
});
