import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { MapModal } from '../components/MapModal';
import { Eye, EyeOff, MapPin } from 'lucide-react';


interface Props {
    onComplete: () => void;
}

export const Onboarding: React.FC<Props> = ({ onComplete }) => {
    const { login: saveToken } = useAuth();
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
    const [countySearch, setCountySearch] = useState('');
    const [constituencySearch, setConstituencySearch] = useState('');
    const [counties, setCounties] = useState<any[]>([]);
    const [constituencies, setConstituencies] = useState<any[]>([]);
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [showCountyResults, setShowCountyResults] = useState(false);
    const [showConstituencyResults, setShowConstituencyResults] = useState(false);
    const [errors, setErrors] = useState<any>({});

    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

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
        fetch('http://localhost:8000/location/counties')
            .then(res => res.json())
            .then(data => setCounties(data))
            .catch(err => console.error("Failed to fetch counties", err));
    }, []);

    useEffect(() => {
        if (formData.county_id) {
            fetch(`http://localhost:8000/location/constituencies?county_id=${formData.county_id}`)
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
            const res = await fetch(`http://localhost:8000/location/reverse?lat=${lat}&lng=${lng}`);
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
        // Form is always "valid" enough to enable the button, validation happens on submit now
        return true;
    };

    const validateFormOnSubmit = () => {
        if (!formData.full_name?.trim()) return "Full name is required.";
        if (!formData.email?.trim()) return "Email is required.";
        if (!formData.id_number?.trim()) return "ID/Passport is required.";
        if (!validatePassword(formData.password || '')) return "Password must be at least 8 characters and contain uppercase, lowercase, numbers, and symbols.";
        if (formData.password !== formData.password_confirm) return "Passwords do not match.";
        if (formData.county_id <= 0) return "Please select a County.";
        if (formData.constituency_id <= 0) return "Please select a Constituency.";
        if (Object.values(errors).some(e => e)) return "Please fix the errors in the form.";
        return null;
    };

    const handleSubmit = async () => {
        if (mode === 'signup') {
            const validationError = validateFormOnSubmit();
            if (validationError) {
                setErrors({ submit: validationError });
                return;
            }
        }

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
            const response = await fetch(`http://localhost:8000${endpoint}`, {
                method: 'POST',
                headers: headers,
                body: body,
            });
            const data = await response.json();
            if (response.ok) {
                saveToken(data.access_token);
                onComplete();
            } else {
                setErrors({ submit: data.detail || 'Authentication failed' });
            }
        } catch (err) {
            setErrors({ submit: 'Authentication failed' });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, type: 'county' | 'constituency') => {
        if (e.key === 'Enter') {
            if (type === 'county') setShowCountyResults(false);
            if (type === 'constituency') setShowConstituencyResults(false);
        }
    };

    return (
        <div className="onboarding-card" style={{ maxWidth: '540px', margin: '1rem auto', padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--primary)', fontWeight: 800 }}>
                {mode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
            </h2>

            {mode === 'login' ? (
                <div className="auth-step">
                    <div style={{ marginBottom: '1rem' }}>
                        <Input
                            label="Email"
                            required
                            value={formData.email || ''}
                            onChangeText={(text) => handleInputChange('email', text)}
                            placeholder="e.g. citizen@parliascope.go.ke"
                        />
                    </div>
                    <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
                        <Input
                            label="Password"
                            required
                            value={formData.password || ''}
                            onChangeText={(text) => handleInputChange('password', text)}
                            placeholder="••••••••"
                            secureTextEntry={!showPassword}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ position: 'absolute', right: '8px', top: '36px', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {errors.submit && <p style={{ color: 'red', textAlign: 'center', marginBottom: '1rem' }}>{errors.submit}</p>}
                    <Button label="Login" onPress={handleSubmit} />
                    <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>
                        Don't have an account? <button onClick={() => setMode('signup')} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Sign Up</button>
                    </p>
                </div>
            ) : (
                <div className="auth-step">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <Input
                            label="Full Name"
                            required
                            value={formData.full_name}
                            onChangeText={(text) => handleInputChange('full_name', text)}
                            placeholder="First Last"
                        />
                        <Input
                            label="ID / Passport"
                            required
                            value={formData.id_number}
                            onChangeText={(text) => handleInputChange('id_number', text)}
                            placeholder="12345678"
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <Input
                            label="Email Address"
                            required
                            value={formData.email}
                            onChangeText={(text) => handleInputChange('email', text)}
                            placeholder="citizen@example.com"
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ position: 'relative' }}>
                            <Input
                                label="Password"
                                required
                                value={formData.password}
                                onChangeText={(text) => handleInputChange('password', text)}
                                placeholder="8+ chars, with symbols"
                                secureTextEntry={!showPassword}
                                error={formData.password && !validatePassword(formData.password) ? 'Password too weak' : ''}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '8px', top: '36px', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Input
                                label="Confirm"
                                required
                                value={formData.password_confirm}
                                onChangeText={(text) => handleInputChange('password_confirm', text)}
                                placeholder="Match password"
                                secureTextEntry={!showPasswordConfirm}
                                error={formData.password_confirm && formData.password !== formData.password_confirm ? "Passwords don't match" : ""}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                                style={{ position: 'absolute', right: '8px', top: '36px', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                            >
                                {showPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Location Information <span style={{ color: 'red' }}>*</span></h3>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '0.75rem' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <Input
                                    label="County"
                                    required
                                    value={countySearch}
                                    onChangeText={(text) => {
                                        setCountySearch(text);
                                        setShowCountyResults(true);
                                        if (text === '') setFormData({ ...formData, county_id: 0, constituency_id: 0 });
                                    }}
                                    onKeyDown={(e: any) => handleKeyDown(e, 'county')}
                                    onFocus={() => setShowCountyResults(true)}
                                    onBlur={() => setTimeout(() => setShowCountyResults(false), 250)}
                                    placeholder="Search County..."
                                />
                                {showCountyResults && countySearch && filteredCounties.length > 0 && (
                                    <div className="dropdown" style={{ position: 'absolute', width: '100%', zIndex: 20, background: 'white', border: '1px solid var(--border)', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                        {filteredCounties.map(c => (
                                            <div key={c.id} onClick={() => { setFormData({ ...formData, county_id: c.id, constituency_id: 0 }); setCountySearch(c.name); setConstituencySearch(''); setShowCountyResults(false); }} style={{ padding: '8px 12px', cursor: 'pointer', background: formData.county_id === c.id ? 'var(--bg-surface)' : 'transparent' }}>{c.name}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <Input
                                    label="Constituency"
                                    required
                                    value={constituencySearch}
                                    onChangeText={(text) => {
                                        setConstituencySearch(text);
                                        setShowConstituencyResults(true);
                                    }}
                                    onKeyDown={(e: any) => handleKeyDown(e, 'constituency')}
                                    onFocus={() => setShowConstituencyResults(true)}
                                    onBlur={() => setTimeout(() => setShowConstituencyResults(false), 250)}
                                    placeholder="Search Constituency..."
                                    disabled={!formData.county_id}
                                />
                                {showConstituencyResults && constituencySearch && formData.county_id > 0 && filteredConstituencies.length > 0 && (
                                    <div className="dropdown" style={{ position: 'absolute', width: '100%', zIndex: 20, background: 'white', border: '1px solid var(--border)', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                        {filteredConstituencies.map(c => (
                                            <div key={c.id} onClick={() => { setFormData({ ...formData, constituency_id: c.id }); setConstituencySearch(c.name); setShowConstituencyResults(false); }} style={{ padding: '8px 12px', cursor: 'pointer', background: formData.constituency_id === c.id ? 'var(--bg-surface)' : 'transparent' }}>{c.name}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', opacity: 0 }}>Map</label>
                                <button
                                    onClick={() => setIsMapOpen(true)}
                                    type="button"
                                    style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '0 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}
                                    title="Pick location from Map"
                                >
                                    <MapPin size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <Button label="Complete Sign Up" onPress={handleSubmit} disabled={!isSignupValid()} />

                    <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>
                        Already have an account? <button onClick={() => setMode('login')} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Log In</button>
                    </p>

                    <MapModal
                        isOpen={isMapOpen}
                        onClose={() => setIsMapOpen(false)}
                        onSelectLocation={handleSelectLocation}
                        initialLocation={formData.latitude ? { lat: formData.latitude, lng: formData.longitude } : undefined}
                    />
                </div>
            )}
        </div>
    );
};
