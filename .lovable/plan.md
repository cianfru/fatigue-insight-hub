

# Fix ULR Build Errors -- Add Required Fields to All Objects

## Overview
The 8 ULR fields on `DutyAnalysis` and 3 on `DutyStatistics` are correctly required. The build errors exist solely because placeholder and mock objects don't include them yet. This fix adds standard-crew defaults to every incomplete object -- no type definitions are touched.

## Files Changed

### 1. `src/data/mockAnalysisData.ts`
Add these 8 fields to each of the 14 mock duty objects:

```typescript
crewComposition: 'standard',
restFacilityClass: null,
isUlr: false,
acclimatizationState: 'acclimatized',
ulrCompliance: null,
inflightRestBlocks: [],
returnToDeckPerformance: null,
preDutyAwakeHours: 0,
```

Add these 3 fields to the `statistics` object:

```typescript
totalUlrDuties: 0,
totalAugmentedDuties: 0,
ulrViolations: [],
```

### 2. `src/components/fatigue/Chronogram.tsx` (~line 960)
Add the same 8 ULR defaults to the `pseudoDuty` object used for rest-day sleep tooltips.

### 3. `src/components/fatigue/HumanPerformanceTimeline.tsx` (~lines 511 and 541)
Add the same 8 ULR defaults to both `pseudoDuty` objects (home-tz path and ISO fallback path).

## What is NOT changed
- `src/types/fatigue.ts` -- no modifications, all ULR fields remain required
- No backend code or API contracts affected
- No behavioral changes to any component

## Technical Detail
The defaults represent a standard (non-ULR) crew configuration, which is the correct baseline for mock data and placeholder tooltip objects. When real backend data includes augmented crew or ULR operations, those values flow through unchanged.

