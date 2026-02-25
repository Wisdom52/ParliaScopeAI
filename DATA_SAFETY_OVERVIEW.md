# Data Environments & Security Overview

This document outlines the infrastructure and security protocols implemented in the ParliaScopeAI project to ensure data integrity and user safety.

---

## 🏗️ Data Environments

The project utilizes a hybrid data environment to support both traditional relational data and modern AI-driven features.

### 1. PostgreSQL (Relational Database)
*   **Purpose**: Stores structured data including user profiles, Kenyan administrative boundaries (Counties & Constituencies), and Hansard document metadata.
*   **Implementation**: Managed via SQLAlchemy ORM, ensuring consistent schemas and preventing direct raw query manipulation.

### 2. pgvector (Vector Storage)
*   **Purpose**: A specialized extension within PostgreSQL used to store high-dimensional embeddings derived from parliamentary transcripts.
*   **Role**: Powers semantic search and AI retrieval (RAG), allowing the "Chat with Hansard" feature to find relevant speech segments based on meaning rather than just keywords.

### 3. Local Private Storage
*   **Purpose**: Temporary handling of Hansard PDFs during ingestion and hosting of generated audio files for the "Daily Brief" feature.
*   **Security**: These assets are served through a protected `/static` route and are explicitly managed to avoid public directory traversal.

---

## 🔐 Data Security Implementation

Security is implemented at multiple layers, from input sanitization to cryptographic storage.

### 1. Cryptographic Password Hashing
*   **Mechanism**: Uses **PBKDF2 with SHA-256** (via the `passlib` library).
*   **Rule**: Plaintext passwords are never stored. Even in the event of a database breach, user credentials remain secure due to one-way salted hashing.

### 2. Session Management (JWT)
*   **Mechanism**: Implements **JSON Web Tokens (JWT)** with `HS256` signing.
*   **Security**: Tokens occupy a short **30-minute lifecycle** to minimize the window of opportunity for intercepted sessions. Tokens are required as "Bearer" headers for all protected API routes (e.g., `/auth/me`).

### 3. Input Sanitization & Validation
*   **Trimming**: All user-facing inputs (emails, names, IDs) are automatically trimmed of leading/trailing whitespace on both Web and Mobile platforms.
*   **Strict Rules**: Passwords must meet modern complexity standards (8+ characters, including uppercase, lowercase, numbers, and symbols) to prevent brute-force attacks.

### 4. Secret Management & Environment Safety
*   **Isolation**: Sensitive configurations (Database credentials, JWT Secret Keys) are strictly stored in `.env` files.
*   **Git Security**: A robust `.gitignore` prevents these secrets from ever being committed to the online repository.

### 5. Database Integrity
*   **SQL Injection Prevention**: By using SQLAlchemy as an abstraction layer, the system automatically sanitizes all inputs before they reach the database engine, neutralizing SQL injection vectors.
