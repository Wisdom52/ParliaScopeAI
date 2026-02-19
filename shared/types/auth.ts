export interface User {
    id: number;
    email?: string;
    county_id?: number;
    constituency_id?: number;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
}

export interface LoginRequest {
    username: string; // OAuth2 form uses username for email
    password: string;
}

export interface SignupRequest {
    email: string;
    password: string;
    password_confirm?: string;
    full_name?: string;
    id_number?: string | number;
    county_id: number;
    constituency_id: number;
    latitude?: number | null;
    longitude?: number | null;
}
