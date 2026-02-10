# Sleep Bar Overlap Diagnosis

## Problem Summary

Sleep bars are overlapping with duty bars in the chronogram, leading to incorrect sleep strategies. This document explains the root causes and debugging steps.

## Root Causes Identified

### 1. **Multi-Day Rest Period Estimation Bug** (HIGH PRIORITY)

**Location:** `src/components/fatigue/Chronogram.tsx:718-754`

When a sleep period spans more than 1 day (e.g., 48+ hour layovers), the frontend **hardcodes** the sleep start time to 22:00:

```typescript
// Multi-day rest period (>1 day span): only render the last night before the duty.
// Estimate sleep start as ~22:00 on the night before endDay
const estimatedSleepStart = 22; // ← HARDCODED!
```

**Why this causes overlaps:**

For your DOH → LHR example (departure at 15:15 DOH, arrival at 19:50 LHR):
- DOH is UTC+3, LHR is UTC+0 (3-hour difference)
- If layover < 48 hours: pilot should maintain **DOH time reference** (EASA acclimatization rules)
- But if the backend sends sleep times in **LHR local time** and frontend assumes **DOH time**, the conversion breaks:
  - Sleep at 22:00 LHR = 01:00 DOH (next day)
  - Sleep at 22:00 DOH = 19:00 LHR (previous day)
- The hardcoded 22:00 doesn't account for this timezone mismatch

**Impact:**
- Pre-duty sleep bars appear in the wrong location
- Sleep bars overlap with subsequent duty bars
- Recovery sleep calculations become incorrect

---

### 2. **Missing EASA 48-Hour Acclimatization Rule** (CRITICAL)

**EASA AMC1 ORO.FTL.105 states:**
- Layover **< 48 hours**: Pilot maintains **home base time reference** (DOH in your case)
- Layover **≥ 48 hours**: Pilot begins **acclimatization to local time**

**Current Status:**
- ❌ Frontend has **NO** implementation of this rule
- ⚠️ Frontend relies entirely on backend to send correct `sleep_start_day_home_tz` values
- ❌ No validation to check if backend is applying the 48-hour rule correctly

**What should happen:**

#### Example: DOH → MIA Flight
**Scenario:** Pilot arrives at MIA at 10:00 local (18:00 DOH time)

**Layover < 48 hours:**
```
Backend should calculate:
- Sleep strategy based on DOH circadian rhythm
- Goes to bed at 23:00 DOH = 15:00 MIA local
- Wakes up after 8 hours at 07:00 DOH = 23:00 MIA local
- sleep_start_day_home_tz, sleep_start_hour_home_tz use DOH timezone
```

**Layover ≥ 48 hours:**
```
Backend should calculate:
- Sleep strategy begins transitioning to MIA time
- Gradual adjustment over 48-hour period
- Final sleep before next duty uses MIA-adapted schedule
- sleep_start_day_home_tz still provided (for chronogram alignment)
  but reflects adapted sleep timing
```

**If this is broken in the backend, all sleep windows will be wrong.**

---

### 3. **Timezone Conversion Fallback Bug** (MEDIUM PRIORITY)

**Location:** `src/components/fatigue/Chronogram.tsx:492-498`

When `sleep_start_day_home_tz` is missing, the code falls back to parsing ISO timestamps. The fallback has a bug:

```typescript
// Fallback for unexpected formats
try {
  const date = new Date(isoStr); // ← CONVERTS TO BROWSER TIMEZONE!
  return {
    dayOfMonth: date.getDate(),
    hour: date.getHours() + date.getMinutes() / 60,
  };
}
```

**Problem:**
- `new Date()` converts the ISO string to the **browser's local timezone**
- If your browser is set to a different timezone than DOH, sleep bars shift to the wrong day/hour
- Example: Browser in UTC+0, home base in UTC+3 → 3-hour shift in all sleep bars

---

### 4. **Deduplication Silently Removes Data** (LOW PRIORITY)

**Location:** `src/components/fatigue/Chronogram.tsx:1073-1098`

When two sleep bars overlap on the same day, the deduplication logic keeps only one:

```typescript
if (overlapping) {
  // Keep the one with more data (qualityFactors) or higher score
  const barHasData = !!bar.qualityFactors;
  const overlapHasData = !!overlapping.qualityFactors;
  if (barHasData && !overlapHasData) {
    kept[idx] = bar; // Replace
  }
  // Otherwise discard the new bar silently
}
```

**Problem:**
- User doesn't know that sleep data was removed
- May hide the actual root cause (timezone mismatch creating false overlaps)

---

## Debugging Steps

### Step 1: Check Browser Console Logs

I've added extensive debug logging. Open your browser console (F12) and look for:

```
[Chronogram Debug] {
  dutyDate: "2026-02-15",
  dutyDayOfMonth: 15,
  sleepStrategy: "recovery",
  hasHomeTz: {
    startDay: 15,        // ← Check if these exist
    startHour: 22.5,
    endDay: 16,
    endHour: 7.0
  },
  hasLocationTz: {      // ← Location timezone values
    startDay: 15,
    startHour: 19.5,
    endDay: 16,
    endHour: 4.0
  },
  isoTimestamps: {
    start: "2026-02-15T22:30:00+03:00",
    end: "2026-02-16T07:00:00+03:00"
  },
  locationTimezone: "Europe/London",
  environment: "hotel"
}
```

**Key things to check:**

1. **Are `hasHomeTz` values present?**
   - ✅ YES → Backend is sending home timezone data correctly
   - ❌ NO → Backend is NOT calculating home timezone values → **BACKEND BUG**

2. **Do `hasHomeTz` and `hasLocationTz` differ?**
   - If they're identical → Backend may be sending wrong timezone
   - They should differ by the UTC offset difference

3. **Check ISO timestamp timezone suffix:**
   - Should be `+03:00` for DOH (UTC+3)
   - If it's `+00:00` for a DOH duty → Backend using wrong timezone

### Step 2: Check for Validation Warnings

Look for these warning messages:

```
[Chronogram] Using location timezone fallback - may cause overlaps!
```
→ Backend didn't send `home_tz` values. Frontend is using location timezone, which breaks the 48-hour rule.

```
[Chronogram] Invalid sleep window - ends before it starts!
```
→ Backend sent corrupt data. Sleep end time is before sleep start time.

```
[Chronogram] Suspicious sleep duration > 20 hours
```
→ Backend may have calculated sleep window incorrectly. 20+ hour sleep is unrealistic.

```
[Chronogram] Detected overlapping sleep bars on same day - deduplicating
```
→ Two sleep bars occupy the same time slot. One will be hidden. This suggests timezone mismatch.

### Step 3: Check Backend Response

Use browser DevTools Network tab to inspect the `/api/analyze` response:

```json
{
  "duties": [
    {
      "duty_id": "...",
      "date": "2026-02-15",
      "sleep_estimate": {
        "sleep_start_time_home_tz": "23:00",  // ← Check this
        "sleep_end_time_home_tz": "07:00",    // ← Check this
        "sleep_start_day_home_tz": 14,        // ← Check this
        "sleep_start_hour_home_tz": 23.0,     // ← Check this
        "sleep_end_day_home_tz": 15,          // ← Check this
        "sleep_end_hour_home_tz": 7.0,        // ← Check this
        "location_timezone": "Europe/London",
        "environment": "hotel"
      }
    }
  ]
}
```

**Expected behavior for DOH → LHR (departure 15:15 DOH):**

If layover < 48 hours:
- `location_timezone` should be `"Europe/London"` ✅
- `sleep_start_time_home_tz` should be in **DOH time** (e.g., "23:00" = 23:00 DOH)
- `sleep_start_day_home_tz` should be the **day in DOH timezone**
- The sleep strategy should follow **DOH circadian rhythm** (not London time)

If these values are in **London time instead of DOH time**, the backend is broken.

---

## Backend Investigation Needed

The backend repository is at: https://github.com/cianfru/fatigue-tool

**Files to check:**

1. **Strategic Sleep Estimator** - likely in `src/` or `app/`
   - Search for: `calculate_sleep_window`, `sleep_strategy`, `acclimatization`
   - Look for: 48-hour rule implementation
   - Check: How `sleep_start_day_home_tz` is calculated

2. **Timezone Conversion Logic**
   - Search for: `convert_to_home_tz`, `pytz`, `ZoneInfo`
   - Look for: How sleep times are converted from local to home base timezone
   - Check: If conversion accounts for date changes (e.g., sleep at 01:00 next day in DOH)

3. **Layover Duration Calculation**
   - Search for: `layover_duration`, `rest_period`, `48`
   - Look for: How the code determines if pilot maintains home base time
   - Check: If this logic is working correctly

**Questions to answer:**

1. Does the backend calculate `sleep_start_day_home_tz` at all?
   - If NO → This must be implemented
   - If YES → Is it converting correctly?

2. Does the backend implement the EASA 48-hour rule?
   - If NO → Sleep strategies for short layovers will be wrong
   - If YES → Is it checking layover duration correctly?

3. Are ISO timestamps being generated with correct timezone offsets?
   - Should include `+03:00` for DOH, `+00:00` for LHR, etc.
   - If they're always UTC (`Z` suffix) → Timezone information is lost

---

## Recommended Fixes

### Frontend Fix (Immediate)

The hardcoded `22:00` assumption needs to be removed. When `daySpan > 1`, the frontend should:

1. Trust the backend's `sleep_start_hour_home_tz` value
2. If missing, fall back to parsing ISO timestamp **in the correct timezone**
3. Add validation to detect timezone mismatches

**I can implement this if you want me to proceed with the fix.**

### Backend Fix (Critical)

The backend MUST provide these fields for every duty:

```python
{
  "sleep_start_day_home_tz": int,      # Day in home base timezone (1-31)
  "sleep_start_hour_home_tz": float,   # Hour in home base timezone (0-24)
  "sleep_end_day_home_tz": int,        # Day in home base timezone (1-31)
  "sleep_end_hour_home_tz": float,     # Hour in home base timezone (0-24)
}
```

**Implementation steps:**

1. Calculate sleep window in **location timezone** (hotel/layover location)
2. Check layover duration:
   - If < 48 hours → Adjust strategy to home base circadian rhythm
   - If ≥ 48 hours → Use location-adapted strategy
3. Convert final sleep window to **home base timezone**
4. Calculate day-of-month and hour in home base timezone
5. Return both location and home base timezone representations

---

## Next Steps

1. **Run the app and check console logs** - This will tell us if backend is sending home_tz values
2. **Inspect network response** - Verify the actual data structure from backend
3. **Check backend code** - Investigate if 48-hour rule is implemented
4. **Fix frontend estimation bug** - Remove hardcoded 22:00 assumption
5. **Add backend home_tz calculation** - If missing, implement it
6. **Test with real scenarios** - Verify with DOH→LHR, DOH→MIA examples

---

## How to Use This Document

1. Load your fatigue insight hub app
2. Open browser console (F12)
3. Upload a roster with the DOH→LHR example
4. Look for the debug logs I added
5. Report back what you see in the logs
6. I'll help you fix the specific issue based on what we find

The debug logs will tell us exactly what's going wrong. Then we can fix it properly instead of guessing.
