export interface User {
    id: number;
    email?: string;
    county_id?: number;
    ward_id?: number;
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
    email?: string;
    password?: string;
    county_id: number;
    ward_id: number;
}
