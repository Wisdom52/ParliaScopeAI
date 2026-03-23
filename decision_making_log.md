---

## Project Totality: Evolution & Milestones

This section provides a chronological history of the project's development, derived from the GitHub commit history.

### Phase 1: Foundation & Data Architecture
*   **Infrastructure Launch (91ba5d8)**: Established the FastAPI backend with PostgreSQL and `pgvector` for semantic intelligence.
*   **Location-Based Schema**: Implemented the core data model for Counties, Constituencies, and Wards to enable localized governance.
*   **Frontend & Mobile Core (634ae73)**: Simultaneous initialization of React (Web) and Expo (Mobile) with shared design tokens.

### Phase 2: Intelligence & Analysis Layer
*   **Hansard Ingestion Pipeline (8293255)**: Built the PDF OCR and speaker mapping engine to turn raw parliamentary records into structured data.
*   **Intelligence Hub (RAG) (690c94e)**: Integrated vector embeddings and RAG (Retrieval-Augmented Generation) for the Document Chat feature.
*   **Audio Digest Engine (c5052f9)**: Implemented multilingual TTS (English/Swahili) and audio summary generation for accessibility.

### Phase 3: Citizen Engagement & Transparency
*   **AI Bill Impact Engine (7ce9b45)**: Developed the logic to segment bills and generate personalized impact analysis cards.
*   **Representative Profiles (86f1554)**: Integrated MP scraping and the Citizen Review system to create accountability loops.
*   **Baraza Live (18d20ca)**: Launched the live debate and polling platform for constituent feedback.

### Phase 4: Administrative Security & Platform Parity
*   **Governance Controls (e20e030)**: Implemented security safeguards, admin dashboard enhancements, and privacy controls (Anonymity).
*   **Mobile Parity Update (b008b14)**: Synchronized the Leader Portal and Admin Dashboard across both platforms.
*   **Data Integrity Fix (a3b98b4)**: Refined speaker matching and Hansard date logic to ensure maximum accuracy in parliamentary reporting.

---

## Technical Decision History

### [DECISION-001] Speaker Matching Normalization (Fuzzy Logic)
*   **Context**: Speech segments from Hansard PDFs were frequently "orphaned" (unlinked to a Speaker ID) because the AI extracted names with variable titles, constituencies, or seats (e.g., "The Speaker (Hon. Moses Wetang'ula)").
*   **Decision**: Implement a multi-stage normalization pipeline in `backend/app/services/pdf_parser.py`.
*   **Rationale**: By stripping titles and using fuzzy matching (threshold 75+), we reliably link speeches to the correct elected official without requiring perfect string parity between PDFs and the database.

### [DECISION-002] Semantic Hansard Date Priority
*   **Context**: The mobile search screen displayed the database `created_at` timestamp (ingestion date), leading to confusion when indexing older 2026 records.
*   **Decision**: Update `mobile/screens/SearchScreen.tsx` to map the document's semantic `date` (parsed from the debate title) to the UI.
*   **Rationale**: Users need to see the date the debate actually happened, not when the AI finished processing it.

### [DECISION-003] Admin Dashboard Mobile Parity Fix
*   **Context**: The project required system administrators to have the same oversight tools on mobile as on the web.
*   **Decision**: Ported the `AdminDashboardScreen.tsx` from Web to Mobile using a three-tab architecture (Overview, Users, System).
*   **Rationale**: Maintains feature parity and ensures that the "Official Command Centre" is accessible regardless of the device.

### [DECISION-004] Fact Shield & Semantic Re-Indexing
*   **Context**: The Fact Shield tool was returning "Inconclusive" results because it lacked correctly indexed context from Hansards.
*   **Decision**: Repaired the speaker matching and ran a full re-indexing of recent Hansards to populate the `SpeechSegment` table with vector embeddings.
*   **Rationale**: Truth verification requires actual parliamentary data. Linking segments back to speakers enabled the LLM to cite specific quotes as proof or debunking evidence.

### [DECISION-005] Personalized Bill Impact Engine
*   **Context**: Bills were generic summaries that didn't help citizens understand how they were personally affected.
*   **Decision**: Created a specialized AI agent to analyze Bill text against specific user "topics" (e.g., "Hospitality", "Taxes", "Agriculture").
*   **Rationale**: By bridging the gap between raw legal text and personal relevance, engagement increases.

### [DECISION-006] Admin Database Inspector
*   **Context**: Administrators lacked a way to monitor live data health (users, Hansards, stances) without direct terminal access to the PostgreSQL database.
*   **Decision**: Implemented a "Database" tab in `AdminDashboardScreen.tsx` (Mobile) and added corresponding inspection endpoints in `backend/app/routes/admin.py`.
*   **Rationale**: Increased transparency for systems operators by providing a read-only view of all database tables and their records, enabling faster troubleshooting and data verification.

---

## Core Architectural Pillars

1.  **Local Self-Reliance**: Use of local LLMs (Ollama) and local embedding models to minimize external API costs and latencies.
2.  **Multilingual Accessibility**: Dual-language support (English/Swahili) at the architectural level for all summaries and audio.
3.  **Semantic Search First**: Relying on `pgvector` and hybrid search (keyword + vector) to navigate complex legislative documents.
4.  **Strict Data Integrity**: Protecting the accuracy of representative quotes and dates to maintain the "Fact Shield" standard.

---
> [!IMPORTANT]
> All decisions were made to prioritize local self-reliance (using local Ollama models) and data integrity (accurate documentation dates and speaker mapping).
