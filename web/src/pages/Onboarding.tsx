import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SignupRequest } from '@shared/types/auth'; // Ensure this alias works or use relative path

// Mock Data for Counties and Wards
const MOCK_COUNTIES = [
    { id: 1, name: 'Nairobi' },
    { id: 2, name: 'Mombasa' },
];

const MOCK_WARDS = {
    1: [{ id: 101, name: 'Kilmimani' }, { id: 102, name: 'Westlands' }],
    2: [{ id: 201, name: 'Nyali' }, { id: 202, name: 'Likoni' }],
};

export const Onboarding: React.FC = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<SignupRequest>({
        county_id: 0,
        ward_id: 0,
        email: '',
        password: '',
    });

    const handleCountySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const countyId = parseInt(e.target.value);
        setFormData({ ...formData, county_id: countyId, ward_id: 0 });
    };

    const handleWardSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFormData({ ...formData, ward_id: parseInt(e.target.value) });
    };

    const handleSubmit = async () => {
        console.log('Submitting Registration:', formData);
        // TODO: Call API endpoint /auth/signup
        try {
            const response = await fetch('http://localhost:8000/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (response.ok) {
                alert('Registration Successful!');
            } else {
                alert(`Error: ${data.detail}`);
            }
        } catch (error) {
            alert('Network Error');
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h2>Welcome to ParliaScope</h2>
            {step === 1 && (
                <>
                    <h3>Select Your Location</h3>
                    <p>This helps us show relevant bills and representatives.</p>
                    <div style={{ marginBottom: '1rem' }}>
                        <label>County:</label>
                        <select
                            value={formData.county_id}
                            onChange={handleCountySelect}
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        >
                            <option value="0">Select County</option>
                            {MOCK_COUNTIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label>Ward:</label>
                        <select
                            value={formData.ward_id}
                            onChange={handleWardSelect}
                            disabled={!formData.county_id}
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        >
                            <option value="0">Select Ward</option>
                            {MOCK_WARDS[formData.county_id as keyof typeof MOCK_WARDS]?.map((w: any) => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>
                    <Button label="Next" onPress={() => setStep(2)} disabled={!formData.county_id || !formData.ward_id} />
                </>
            )}

            {step === 2 && (
                <>
                    <h3>Create Account</h3>
                    <div style={{ marginBottom: '1rem' }}>
                        <Input
                            value={formData.email || ''}
                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                            placeholder="Email (Optional for Guest)"
                        />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <Input
                            value={formData.password || ''}
                            onChangeText={(text) => setFormData({ ...formData, password: text })}
                            placeholder="Password"
                            secureTextEntry
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <Button label="Back" onPress={() => setStep(1)} variant="secondary" />
                        <Button label="Complete Setup" onPress={handleSubmit} />
                    </div>
                </>
            )}
        </div>
    );
};
