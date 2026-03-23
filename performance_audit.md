# ParliaScope Performance & Efficiency Audit

This report analyzes the current state of the ParliaScope platform (Web, Mobile, and Backend) and identifies optimizations to improve performance, scalability, and user experience—all without requiring immediate code changes.

---

## 🚀 1. Speed & Loading Times

### [High Impact] Gzip/Brotli Compression
*   **Observation**: The backend (`backend/app/main.py`) does not currently use Gzip middleware. Large JSON payloads (especially search results with long transcripts) are transferred in raw text format.
*   **Improvement**: Enabling `GzipMiddleware` in FastAPI would reduce payload sizes by up to 70-80%, significantly speeding up page loads on mobile data.

### [High Impact] Database Connection Pooling
*   **Observation**: The SQLAlchemy engine uses default settings (`backend/app/database.py`).
*   **Improvement**: Configuring `pool_size` (e.g., 20) and `max_overflow` would prevent the application from exhausting database connections during traffic spikes (e.g., during a live Baraza session).

### [Medium Impact] API Response hydration
*   **Observation**: The search endpoint (`/search/query`) returns full `content` for every segment.
*   **Improvement**: Implementing "Snippet" returns (first 200 characters + match highlighting) would drastically reduce the initial data load for search results. Full content should only be fetched when the user clicks a specific item.

---

## 🔍 2. Chunking & Segmentations (AI/RAG)

### [Critical] Sub-segmentation of Speeches
*   **Observation**: Hansard speeches are currently stored as one `SpeechSegment` per speaker turn (`backend/app/services/pdf_parser.py`). Some turns in parliamentary debates can last 10+ pages.
*   **Issue**: Extremely long segments dilute semantic search accuracy and can exceed the LLM's context window during "Discuss Document" chats.
*   **Improvement**: Implement recursive character splitting (e.g., max 1000 tokens per chunk with overlap) to ensure the AI always has precise, manageable context.

### [Medium] Vector Similarity Indexing
*   **Observation**: The `embedding` column in `speech_segments` is a `Vector(768)` but lacks a HNSW or IVFFlat index.
*   **Issue**: Every AI-powered search currently performs a "Sequential Scan" (checking every row individually).
*   **Improvement**: Adding a `pgvector` HNSW index would make searches near-instant even with 100,000+ segments.

---

## ⚡ 3. API & Backend Efficiency

### [Secondary] Redundant Speaker Lookups
*   **Observation**: During PDF ingestion, the system queries the entire `Speaker` table for every single segment processed (`match_speaker` in `pdf_parser.py`).
*   **Improvement**: Load the speaker list into memory (cache) once at the start of the `process_hansard_pdf` function to save hundreds of redundant database calls per document.

### [Secondary] ILIKE vs. Full Text Search
*   **Observation**: Keyword search uses `ILIKE` on raw text.
*   **Improvement**: Migrating to PostgreSQL **Full Text Search (FTS)** using `tsvector` would allow for linguistic matching (e.g., searching "taxes" matches "taxing") and significantly faster indexing.

---

## 📱 4. Frontend (Web/Mobile) UX

### [High] Memorized Components & Re-renders
*   **Observation**: Both Web and Mobile apps manage Chat inputs in the parent `SearchPage` state. Every keystroke triggers a re-render of the entire document list/modal.
*   **Improvement**: Encapsulate the Chat and Fact-Shield inputs into their own memoized components to ensure 60fps interaction speed.

### [Medium] Server-Side Filtering
*   **Observation**: Lists are filtered in-browser/in-app after fetching all records.
*   **Improvement**: Move filtering to the API (`?q=query`) to ensure the device only ever handles the data it needs to display.

---

## 📈 Summary of Potential Gains

| Area | Effort | Speed Gain | Scalability Gain |
| :--- | :--- | :--- | :--- |
| **Gzip Compression** | Low | ⚡⚡⚡ | 📈 |
| **Vector Indexing** | Low | ⚡⚡⚡ | 📈📈📈 |
| **Speaker Caching** | Low | ⚡ | 📈 |
| **Sub-segmenting** | Medium | ⚡ | 📈📈 |
| **FTS Indexing** | Medium | ⚡⚡ | 📈📈 |

> [!NOTE]
> These improvements focus on the "Data Infrastructure" layer. Since your rule is "No Code Changes," these serve as a strategic roadmap for the next phase of development to ensure ParliaScope remains fast as legislative data grows.
