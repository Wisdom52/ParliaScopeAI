# ParliaScope Milestone 1: Infrastructure & Data Architecture

This milestone establishes the backend foundation and database schema necessary for location-based parliamentary tracking and AI vector search.

## Setup Instructions

1. **Database Infrastructure**:
   - Ensure Docker is installed.
   - Run `docker-compose up -d` in the `backend` directory to start the PostgreSQL database with the `pgvector` extension.

2. **Backend Installation**:
   - Create a virtual environment: `python -m venv venv`
   - Activate it: `.\venv\Scripts\activate` (Windows)
   - Install dependencies: `pip install -r requirements.txt`

3. **Running Migrations**:
   - Once the database is up, Run: `alembic upgrade head`
   - This will create the `counties`, `constituencies`, `wards`, and `speech_segments` tables.

## Success Criteria Checklist
- [x] **Database connection established**: Configured via SQLAlchemy and Pydantic-settings.
- [x] **Vector queries operational**: `pgvector` support integrated into `speech_segments` table.
- [x] **Schema migrations completed**: Alembic migrations scripts generated and ready for execution.
