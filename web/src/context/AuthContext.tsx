import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    id: number;
    email: string | null;
    full_name: string | null;
    id_number: string | null;
    county_id: number | null;
    constituency_id: number | null;
    county_name?: string;
    constituency_name?: string;
    whatsapp_number?: string | null;
    push_token?: string | null;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('parliaScope_token'));
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (authToken: string) => {
        try {
            const response = await fetch('http://localhost:8000/auth/me', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
            } else {
                logout();
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchProfile(token);
        } else {
            setLoading(false);
        }
    }, [token]);

    const login = (newToken: string) => {
        localStorage.setItem('parliaScope_token', newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem('parliaScope_token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
