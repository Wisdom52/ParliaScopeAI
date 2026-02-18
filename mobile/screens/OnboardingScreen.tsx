import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SignupRequest } from '@shared/types/auth';
import { API_BASE_URL } from '../config/api';

// Mock Data
const MOCK_COUNTIES = [
    { id: 1, name: 'Nairobi' },
    { id: 2, name: 'Mombasa' },
];

const MOCK_WARDS = {
    1: [{ id: 101, name: 'Kilmimani' }, { id: 102, name: 'Westlands' }],
    2: [{ id: 201, name: 'Nyali' }, { id: 202, name: 'Likoni' }],
};

interface Props {
    onComplete: () => void;
}

export const OnboardingScreen: React.FC<Props> = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<SignupRequest>({
        county_id: 0,
        ward_id: 0,
        email: '',
        password: '',
    });

    const handleSubmit = async () => {
        try {
            // Replace with actual IP for simulator (10.0.2.2 for Android, LAN IP for physical device)
            const response = await fetch(`${API_BASE_URL}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (response.ok) {
                onComplete();
            } else {
                Alert.alert('Error', data.detail);
            }
        } catch (error) {
            Alert.alert('Error', 'Network request failed');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to ParliaScope</Text>

            {step === 1 && (
                <View style={styles.stepContainer}>
                    <Text style={styles.label}>Select County</Text>
                    {/* Note: React Native Picker requires installation, using simple buttons for mock if needed, 
                but let's assumes we'd implementation a selector. 
                For MVP, we'll just mock the selection as strict inputs or use a basic view if picker missing.
                Actually standard Expo has no built-in Picker anymore, usually @react-native-picker/picker. 
                To stick to "Deliverables" strictly and "Shared UI Kit", I will use a simplified approach 
                or just assume the user will pick ID 1 for now if I can't install libraries.
                
                Correction: I'll use a mocked UI with Buttons for selection for simplicity 
                to avoid installing native dependencies that might break the flow right now.
            */}
                    <View style={{ gap: 10, marginVertical: 10 }}>
                        {MOCK_COUNTIES.map(c => (
                            <Button
                                key={c.id}
                                label={c.name}
                                onPress={() => setFormData({ ...formData, county_id: c.id, ward_id: 0 })}
                                variant={formData.county_id === c.id ? 'primary' : 'secondary'}
                            />
                        ))}
                    </View>

                    {formData.county_id > 0 && (
                        <>
                            <Text style={styles.label}>Select Ward</Text>
                            <View style={{ gap: 10, marginVertical: 10 }}>
                                {MOCK_WARDS[formData.county_id as keyof typeof MOCK_WARDS]?.map((w: any) => (
                                    <Button
                                        key={w.id}
                                        label={w.name}
                                        onPress={() => setFormData({ ...formData, ward_id: w.id })}
                                        variant={formData.ward_id === w.id ? 'primary' : 'secondary'}
                                    />
                                ))}
                            </View>
                        </>
                    )}

                    <View style={{ marginTop: 20 }}>
                        <Button label="Next" onPress={() => setStep(2)} disabled={!formData.county_id || !formData.ward_id} />
                    </View>
                </View>
            )}

            {step === 2 && (
                <View style={styles.stepContainer}>
                    <Text style={styles.label}>Create Account</Text>
                    <View style={{ marginVertical: 10 }}>
                        <Input
                            value={formData.email || ''}
                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                            placeholder="Email"
                        />
                    </View>
                    <View style={{ marginVertical: 10 }}>
                        <Input
                            value={formData.password || ''}
                            onChangeText={(text) => setFormData({ ...formData, password: text })}
                            placeholder="Password"
                            secureTextEntry
                        />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                        <View style={{ flex: 1, marginRight: 5 }}>
                            <Button label="Back" onPress={() => setStep(1)} variant="secondary" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 5 }}>
                            <Button label="Finish" onPress={handleSubmit} />
                        </View>
                    </View>
                </View>
            )}

            <TouchableOpacity
                onPress={onComplete}
                style={{ marginTop: 30, alignItems: 'center' }}
            >
                <Text style={{ color: '#007AFF', fontSize: 16 }}>Skip — continue as guest →</Text>
            </TouchableOpacity>
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
    }
});
