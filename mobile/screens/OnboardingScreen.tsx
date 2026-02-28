import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SignupRequest } from '@shared/types/auth'; // Keep if used for types
import { MapModal } from '../components/MapModal';
import { API_BASE_URL } from '../config/api';



interface Props {
    onComplete: () => void;
}

export const OnboardingScreen: React.FC<Props> = ({ onComplete }) => {
    const [mode, setMode] = useState<'signup' | 'login'>('login');
    const [formData, setFormData] = useState<any>({
        county_id: 0,
        constituency_id: 0,
        email: '',
        password: '',
        full_name: '',
        id_number: '',
        password_confirm: '',
        latitude: null,
        longitude: null,
    });
    const [counties, setCounties] = useState<any[]>([]);
    const [constituencies, setConstituencies] = useState<any[]>([]);
    const [countySearch, setCountySearch] = useState('');
    const [constituencySearch, setConstituencySearch] = useState('');
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [showCountyResults, setShowCountyResults] = useState(false);
    const [showConstituencyResults, setShowConstituencyResults] = useState(false);
    const [errors, setErrors] = useState<any>({});

    const validatePassword = (pass: string) => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(pass);
    };

    const handleInputChange = (field: string, value: string) => {
        // Trim non-password fields
        const trimmedValue = field.includes('password') ? value : value.trimStart();

        setFormData((prev: any) => ({ ...prev, [field]: trimmedValue }));

        // Clear error when user types
        if (errors[field]) {
            setErrors((prev: any) => ({ ...prev, [field]: null }));
        }
    };

    useEffect(() => {
        fetch(`${API_BASE_URL}/location/counties`)
            .then(res => res.json())
            .then(data => setCounties(data))
            .catch(err => console.error("Failed to fetch counties", err));
    }, []);

    useEffect(() => {
        if (formData.county_id) {
            fetch(`${API_BASE_URL}/location/constituencies?county_id=${formData.county_id}`)
                .then(res => res.json())
                .then(data => setConstituencies(data))
                .catch(err => console.error("Failed to fetch constituencies", err));
        }
    }, [formData.county_id]);

    const filteredCounties = counties.filter(c =>
        c.name.toLowerCase().includes(countySearch.toLowerCase())
    );

    const filteredConstituencies = constituencies.filter(c =>
        c.name.toLowerCase().includes(constituencySearch.toLowerCase())
    );

    const handleSelectLocation = async (lat: number, lng: number) => {
        setFormData((prev: any) => ({ ...prev, latitude: lat, longitude: lng }));
        try {
            const res = await fetch(`${API_BASE_URL}/location/reverse?lat=${lat}&lng=${lng}`);
            const data = await res.json();
            if (data.county) {
                setFormData((prev: any) => ({ ...prev, county_id: data.county.id, latitude: lat, longitude: lng }));
                setCountySearch(data.county.name);
                setShowCountyResults(false);
            }
            if (data.constituency) {
                setFormData((prev: any) => ({ ...prev, constituency_id: data.constituency.id }));
                setConstituencySearch(data.constituency.name);
                setShowConstituencyResults(false);
            }
        } catch (err) {
            console.error("Reverse geocoding failed", err);
        }
    };

    const isSignupValid = () => {
        return (
            formData.full_name?.trim() &&
            formData.email?.trim() &&
            validatePassword(formData.password || '') &&
            formData.password === formData.password_confirm &&
            formData.county_id > 0 &&
            formData.constituency_id > 0 &&
            Object.values(errors).every(e => !e)
        );
    };

    const handleSubmit = async () => {
        const endpoint = mode === 'signup' ? '/auth/signup' : '/auth/login';
        let body: any = JSON.stringify(formData);
        let headers: any = { 'Content-Type': 'application/json' };

        if (mode === 'login') {
            const params = new URLSearchParams();
            params.append('username', formData.email || '');
            params.append('password', formData.password || '');
            body = params.toString();
            headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        }

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: headers,
                body: body,
            });
            const data = await response.json();
            if (response.ok) {
                await AsyncStorage.setItem('parliaScope_token', data.access_token);
                onComplete();
            } else {
                Alert.alert('Error', data.detail || 'Authentication failed');
            }
        } catch (error) {
            Alert.alert('Error', 'Network request failed');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{mode === 'signup' ? 'Create Your Account' : 'Welcome Back'}</Text>

            {mode === 'login' ? (
                <View style={styles.stepContainer}>
                    <View style={{ marginVertical: 5 }}>
                        <Input
                            label="Email"
                            required
                            value={formData.email || ''}
                            onChangeText={(text) => handleInputChange('email', text)}
                            placeholder="Email address"
                        />
                    </View>
                    <View style={{ marginVertical: 5 }}>
                        <Input
                            label="Password"
                            required
                            value={formData.password || ''}
                            onChangeText={(text) => handleInputChange('password', text)}
                            placeholder="Password"
                            secureTextEntry
                        />
                    </View>
                    <View style={{ marginTop: 20 }}>
                        <Button label="Login" onPress={handleSubmit} />
                    </View>
                    <TouchableOpacity onPress={() => setMode('signup')} style={{ marginTop: 20, alignItems: 'center' }}>
                        <Text style={{ color: '#007AFF', fontSize: 16 }}>Don't have an account? Sign Up</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.stepContainer}>
                    <View style={{ marginBottom: 10 }}>
                        <Input
                            label="Full Name"
                            required
                            value={formData.full_name}
                            onChangeText={(text) => handleInputChange('full_name', text)}
                            placeholder="First Last"
                        />
                    </View>
                    <View style={{ marginBottom: 10 }}>
                        <Input
                            label="Email Address"
                            required
                            value={formData.email}
                            onChangeText={(text) => handleInputChange('email', text)}
                            placeholder="citizen@example.com"
                        />
                    </View>
                    <View style={{ marginBottom: 10 }}>
                        <Input
                            label="ID / Passport"
                            required
                            value={formData.id_number}
                            onChangeText={(text) => handleInputChange('id_number', text)}
                            placeholder="National ID / Passport"
                        />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Password"
                                required
                                value={formData.password}
                                onChangeText={(text) => handleInputChange('password', text)}
                                placeholder="8+ chars"
                                secureTextEntry
                                error={formData.password && !validatePassword(formData.password) ? 'Weak' : ''}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="Confirm"
                                required
                                value={formData.password_confirm}
                                onChangeText={(text) => handleInputChange('password_confirm', text)}
                                placeholder="Match"
                                secureTextEntry
                                error={formData.password_confirm && formData.password !== formData.password_confirm ? "Mismatch" : ""}
                            />
                        </View>
                    </View>

                    <View style={{ borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 15, marginBottom: 15 }}>
                        <Text style={styles.label}>Location Information</Text>
                        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                            <View style={{ flex: 1, position: 'relative', marginBottom: 10 }}>
                                <Input
                                    label="County"
                                    required
                                    value={countySearch}
                                    onChangeText={(text) => {
                                        setCountySearch(text);
                                        setShowCountyResults(true);
                                        if (text === '') setFormData((prev: any) => ({ ...prev, county_id: 0, constituency_id: 0 }));
                                    }}
                                    onFocus={() => setShowCountyResults(true)}
                                    onBlur={() => setTimeout(() => setShowCountyResults(false), 200)}
                                    placeholder="Search County..."
                                />
                                {showCountyResults && countySearch !== '' && (
                                    <View style={styles.dropdown}>
                                        {filteredCounties.slice(0, 5).map(c => (
                                            <TouchableOpacity key={c.id} onPress={() => { setFormData((prev: any) => ({ ...prev, county_id: c.id, constituency_id: 0 })); setCountySearch(c.name); setConstituencySearch(''); setShowCountyResults(false); }} style={styles.dropdownItem}>
                                                <Text>{c.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <View style={{ flex: 1, position: 'relative', marginBottom: 10 }}>
                                <Input
                                    label="Constituency"
                                    required
                                    value={constituencySearch}
                                    onChangeText={(text) => {
                                        setConstituencySearch(text);
                                        setShowConstituencyResults(true);
                                    }}
                                    onFocus={() => setShowConstituencyResults(true)}
                                    onBlur={() => setTimeout(() => setShowConstituencyResults(false), 200)}
                                    placeholder="Search Constituency..."
                                    disabled={!formData.county_id}
                                />
                                {showConstituencyResults && constituencySearch !== '' && (
                                    <View style={styles.dropdown}>
                                        {filteredConstituencies.slice(0, 5).map(c => (
                                            <TouchableOpacity key={c.id} onPress={() => { setFormData((prev: any) => ({ ...prev, constituency_id: c.id })); setConstituencySearch(c.name); setShowConstituencyResults(false); }} style={styles.dropdownItem}>
                                                <Text>{c.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <View style={{ marginBottom: 10, marginTop: 18 }}>
                                <TouchableOpacity
                                    onPress={() => setIsMapOpen(true)}
                                    style={{ backgroundColor: '#007AFF', borderRadius: 8, paddingHorizontal: 15, height: 44, justifyContent: 'center', alignItems: 'center' }}
                                >
                                    <Ionicons name="location-outline" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <Button label="Complete Sign Up" onPress={handleSubmit} disabled={!isSignupValid()} />
                    <TouchableOpacity onPress={() => setMode('login')} style={{ marginTop: 15, alignItems: 'center' }}>
                        <Text style={{ color: '#007AFF' }}>Already have an account? Log In</Text>
                    </TouchableOpacity>

                    <MapModal
                        isOpen={isMapOpen}
                        onClose={() => setIsMapOpen(false)}
                        onSelectLocation={handleSelectLocation}
                        initialLocation={formData.latitude ? { lat: formData.latitude, lng: formData.longitude } : undefined}
                    />
                </View>
            )}

            <View style={{ marginTop: 20, alignItems: 'center' }}>
                <Text style={{ color: '#ccc', fontSize: 12 }}>ParliaScope AI - Citizen Engagement Platform</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
    },
    stepContainer: {
        width: '100%',
    },
    label: {
        fontSize: 16,
        marginBottom: 5,
        fontWeight: '600'
    },
    dropdown: {
        borderWidth: 1,
        borderColor: '#f0f0f0',
        borderRadius: 8,
        marginTop: 5,
        backgroundColor: '#fff',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    dropdownItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f9f9f9',
    },
    activeItem: {
        backgroundColor: '#e6f2ff',
    }
});
