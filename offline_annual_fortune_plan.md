# Offline Zi Wei Dou Shu Annual Fortune App (PC)
## Architectural & Implementation Plan

This document outlines the complete structural and data architecture required to build a privacy-first, fully **offline desktop application** for generating **Annual Fortunes (流年運程)**. It relies on the open-source calculation engine of `ziwei-doushu`, historical textual matrices, and a pre-seeded local relational database.

---

## 1. High-Level Architecture Block Diagram

The application leverages a lightweight desktop runtime enviornment (**Tauri** or **Electron**) to isolate data processing locally on the user's PC, guaranteeing zero network dependency and absolute data privacy.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DESKTOP APP WINDOW (UI)                         │
│  [ Electron / Tauri Renderer (React/Tailwind) ]                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ IPC Bridge (Secure Local Pipes)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       LOCAL APPLICATION CORE                           │
│  [ Main Process Runtime (Node.js or Rust Backend) ]                    │
│                                                                        │
│  ┌────────────────────────┐         ┌────────────────────────────────┐ │
│  │   Calculation Engine   │         │  Local Data & Scripting Layer  │ │
│  │  (From Repo: lib/ziwei) │         │       (SQLite Database)        │ │
│  └───────────┬────────────┘         └───────────────┬────────────────┘ │
└──────────────┼──────────────────────────────────────┼──────────────────┘
               │ Outputs Astro Metadata               │ Fetches Text Blocks
               └───────────────────┬──────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         INTERPRETATION ENGINE                          │
│                                                                        │
│  1. Map Dynamic Annual Stars -> 2. Match Classical/V4.0 Text Strings   │
│  3. Compile Unified Fortune Report Markdown                            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
                     [ Final Annual Fortune UI Screen ]
```

---

## 2. Technology Stack Selection

| Architectural Layer | Selected Technology | Structural Role & Justification |
| :--- | :--- | :--- |
| **Desktop Wrapper Shell** | **Tauri (v2)** | Packages web-compiled frontend code into a fast, highly secure native desktop executable (`.exe`, `.dmg`). Compiles down to an extremely small binary storage footprint (< 15MB footprint compared to Electron's 100MB+ design). |
| **Calculation Engine** | **`lib/ziwei/`** | Migrated directly out of the target repository ecosystem. Ingests birth dimensions, executes planetary math calculations entirely inside local JavaScript/TypeScript contexts. |
| **Offline Data Layer** | **SQLite** | A self-contained, serverless relational database engine. Pre-seeded with astrological aphorisms, star dictionaries, and parsed textual mappings derived from the repository's open-source Dataset releases. |
| **Frontend Renderer** | **React.js + Tailwind CSS** | Renders the classical interactive 12-Palace structural grid map layout and formats long-form scrollable fortune interpretations using structured markdown parsing templates. |

---

## 3. Data Processing Pipeline (Step-by-Step)

When a user triggers an input compilation request, the software steps through four discrete offline data mutation layers:

### Step 1: Chronological Adjustment & Normalization
1. **Input Collection:** App UI captures user raw inputs: `Birth Date (YYYY-MM-DD)`, `Clock Time (HH:MM)`, `Gender (Male/Female)`, and `Birth City/Region`.
2. **True Solar Time Correction (`true-solar-time.ts`):** Looks up coordinate datasets inside `cities.ts` to calculate longitude adjustments against standard timezone offsets (+8 UTC baseline), evening out the local birth hour calculations.
3. **Daylight Savings Clamp (`dst-cn.ts`):** Cross-references standard structural charts tracking historic Chinese daylight-saving implementation tables (1986–1991), dynamically backing out 1 hour from standard clock-times if an active seasonal match is confirmed.
4. **Index Mapping:** Resolves the corrected clock time directly into an Earthly Branch Hour Index integer configuration ranging sequentially from **`0` (Zi / 子)** to **`11` (Hai / 亥)**.

### Step 2: Dual-Tier Astrological Computation
The application executes the calculation pipeline engine (`algorithm.ts`) twice in a single, sandboxed local thread sequence:
* **The Lifetime Structural Parse (Natal Layer):** Builds the core operational structural life chart grid mapping coordinates (Self, Wealth, Career, Spouse, etc.) establishing baseline house and planetary coordinates.
* **The Chronological Shift Mapping (Annual Limit Layer):** Feeds the target fortune year parameter (e.g., *2027*) straight into the local `yunxian-context.ts` controller module. The engine shifts calculation metrics downstream to pinpoint the dynamic **Flowing Annual Palace (流年命宫)**, identifies volatile shifting **Annual Flying Stars (流年四化)**, and transposes the **Annual Deities (流年神煞)**.

### Step 3: Relational Database Lookup Strategies
With structural chart data arrays calculated into variables, the runtime backend queries the local pre-seeded relational tables via structured lookups:

```
                  [Engine Output Data Payload]
                               │
             ┌─────────────────┴─────────────────┐
             ▼                                   ▼
    [Primary Lookup Path]               [Secondary Evaluation]
    Query star_interpretations          Cross-Reference Aphorisms
    & flying_star_effects               against lib/classics/
             │                                   │
             └─────────────────┬─────────────────┘
                               ▼
              [Compile Unified Report Engine via MD]
```

1. **The Core Planetary Matrix Lookup:** Interrogates local relational store tables matching the structural state parameters generated by the engine math matrix (e.g., `WHERE star_name='Ju Men' AND palace_type='career' AND brightness='Xian'`).
2. **The Volatile Flying Transformation Extraction:** Queries specific transformation text assets (`WHERE transformation='Ji' AND star_name='Tai Yin' AND annual_palace='wealth'`) to highlight the baseline warnings for the annual cycle.
3. **Traditional Literary Grounding:** Accesses public-domain string assets localized right inside `lib/classics/quanshu.ts` to surface raw, historical literary verse commentary accompanying specific celestial configurations.

### Step 4: Markdown Aggregator Assembly
The interface engine streams the matched text segments into an optimized, unified template layout array. Text fields compile cleanly into structured markdown modules, feeding direct outputs cleanly to the user display interface without calling outside servers.

---

## 4. Local Database Schema Blueprints (SQLite)

The local asset bundle bundles a single pre-compiled `app_data.db` file shipped as an immutable binary container inside the application core bundle.

### Table A: `star_interpretations`
Maintains structural analysis entries explaining how specific stars impact particular life houses during annual transitions.
```sql
CREATE TABLE star_interpretations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    star_name TEXT NOT NULL,          -- e.g., 'Zi Wei', 'Ju Men'
    palace_type TEXT NOT NULL,        -- e.g., 'career', 'wealth', 'health'
    brightness TEXT,                  -- e.g., 'Miao' (廟), 'Wang' (旺), 'Xian' (陷)
    interpretation_text TEXT NOT NULL -- Detailed semantic narrative block
);

CREATE INDEX idx_star_palace_bright 
ON star_interpretations (star_name, palace_type, brightness);
```

### Table B: `flying_star_effects`
Maps out the localized impacts generated by the highly volatile Yearly Flying Star Transformations (四化).
```sql
CREATE TABLE flying_star_effects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    star_name TEXT NOT NULL,          -- e.g., 'Tai Yin', 'Tan Lang'
    transformation TEXT NOT NULL,     -- 'Lu' (祿), 'Quan' (權), 'Ke' (科), 'Ji' (忌)
    annual_palace TEXT NOT NULL,      -- Shifting house where effect is registered
    fortune_impact TEXT NOT NULL      -- Modern actionable textual explanation
);

CREATE INDEX idx_flying_stars 
ON flying_star_effects (star_name, transformation, annual_palace);
```

### Table C: `classical_verses`
Maintains standard historical indexing links targeting verbatim classical texts included in `lib/classics/`.
```sql
CREATE TABLE classical_verses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_book TEXT NOT NULL,        -- 'gusuifu', 'quanshu', 'quanji'
    star_combination TEXT NOT NULL,   -- e.g., 'ZiWei_TianFu', 'LingXing_Ji'
    original_verse TEXT NOT NULL,     -- e.g., "紫府同宮，終身福厚..."
    vernacular_explanation TEXT       -- Simplified modern translation block
);
```

---

## 5. Phased Implementation Roadmap

```
 ┌────────────────────────────────────────────────────────┐
 │ PHASE 1: Algorithmic Core Extraction & Testing         │
 │ • Isolate lib/ziwei/ and lib/classics/ from repository.│
 │ • Build a headless Node.js/Bun CLI test sandbox.       │
 │ • Confirm target year payload parsing behaves determinis-│
 │   tically under local standard execution runs.         │
 └───────────────────────────┬────────────────────────────┘
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ PHASE 2: Database Structural Seeding                   │
 │ • Download a target slice from the v4.0 dataset releases.│
 │ • Run automated ETL scripts to parse JSON Lines text    │
 │   strings into relational SQLite asset tables.         │
 │ • Index query combinations to secure instant local look-│
 │   ups under sub-millisecond execution speeds.          │
 └───────────────────────────┬────────────────────────────┘
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ PHASE 3: Integration Wrapper Development               │
 │ • Construct a localized controller module to catch engine│
 │   payload structures.                                  │
 │ • Map payload parameters directly into dynamic native  │
 │   database parameter queries.                          │
 │ • Format incoming text arrays cleanly into standard MD.│
 └───────────────────────────┬────────────────────────────┘
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ PHASE 4: Desktop Shell Packaging                       │
 │ • Bind the React UI engine into a Tauri workspace shell.│
 │ • Register native local SQLite bindings over Tauri IPC.│
 │ • Execute compilation profiles to build final system   │
 │   installers (.exe / .dmg) for distribution.           │
 └────────────────────────────────────────────────────────┘
```