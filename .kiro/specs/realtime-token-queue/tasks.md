# Implementation Plan: realtime-token-queue

## Overview

Replace all hardcoded and mock token logic in Digital Chikitsak with a fully live, Supabase-backed real-time queue system. Tasks are ordered so each step produces working, testable code before the next step builds on it. The triage engine and property-based tests come first so correctness is established before any UI is wired up.

---

## Tasks

- [x] 1. Supabase schema and Realtime setup
  - Run the following SQL in the Supabase SQL editor for project `dgaurgpojceogqjsuiqw`
  - Create enums: `doctor_status`, `token_status`, `priority_level`
  - Create tables: `doctors`, `patients` (Supabase-native, separate from MySQL), `tokens`, `symptoms`
  - Create indexes: `idx_tokens_doctor_status`, `idx_tokens_patient_status`, `idx_doctors_status`
  - Set `REPLICA IDENTITY FULL` on `tokens` and `doctors`
  - Enable RLS and create all policies as specified in the design document
  - Add `jitsi_room TEXT` column to `tokens` (set when `status = 'in_consultation'`)
  - Verify: open Supabase Table Editor and confirm all four tables exist with correct columns and enum types
  - Verify: open Supabase Realtime dashboard and confirm `tokens` and `doctors` are in the publication
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Triage engine and property-based tests
  - [x] 2.1 Create `frontend/rishu-diital-chikitsak/src/services/triage.js`
    - Export pure function `triage({ symptoms, age })` returning `{ priority, severity }`
    - Implement four rules in order: emergency (chest_pain + shortness_breath), senior (age > 60), child (age < 12), general
    - No imports, no side effects — pure function only
    - _Requirements: 6.1, 9.1, 9.3_

  - [ ]* 2.2 Write property-based tests for triage and queue logic
    - Create `frontend/rishu-diital-chikitsak/src/tests/queue.property.test.js`
    - Install fast-check if not present: `npm install --save-dev fast-check` in `frontend/rishu-diital-chikitsak/`
    - Each test tagged with `// Feature: realtime-token-queue, Property N: <text>`
    - **Property 1**: Generate random token arrays with mixed statuses and token_numbers; assert filtered+sorted result contains only `waiting` tokens ordered ascending by `token_number` — Validates: Requirements 1.6, 3.5
    - **Property 2**: Generate random maps of doctorId → waitingCount; assert `selectBestDoctor` always picks the minimum — Validates: Requirements 2.1
    - **Property 3**: Generate random existing token_number arrays per doctor; assert new token_number equals `MAX + 1` (or 1 if empty) — Validates: Requirements 2.2
    - **Property 4**: Generate patient with active token; assert second `generateToken` call throws 409 — Validates: Requirements 2.5
    - **Property 5**: Generate random queue snapshots; assert `getQueuePosition` equals count of waiting tokens with lower token_number — Validates: Requirements 3.1
    - **Property 6**: Generate random `(position, avgTime)` pairs with `avgTime > 0`; assert `getEstimatedWait(p, t) === p * t` and result ≥ 0 — Validates: Requirements 3.2
    - **Property 7**: Generate random mixed-priority queues; assert `callNext` selects emergency first, then by lowest token_number within priority — Validates: Requirements 5.3, 5.4
    - **Property 8**: Generate in_consultation tokens; assert `markDone` sets token to done, doctor.current_patient_id to null, doctor.status to online; assert calling twice produces same state — Validates: Requirements 5.5
    - **Property 9**: Generate random symptom JSON objects; assert round-trip through `symptoms_json` field preserves deep equality — Validates: Requirements 6.1
    - **Property 10**: Generate random UUIDs; assert `getJitsiRoomId(id) === 'chikitsak-' + id` — Validates: Requirements 7.1
    - **Property 11**: Generate random mixed-priority token arrays; assert sorted output places emergency before senior before child before general, with ascending token_number within each group — Validates: Requirements 9.1, 9.2
    - **Property 12**: Generate random doctor status sets; assert `selectBestDoctor` never picks a doctor with status other than `online` — Validates: Requirements 8.4, 2.4
    - Verify: run `npx vitest run src/tests/queue.property.test.js` from `frontend/rishu-diital-chikitsak/`

- [x] 3. Queue service
  - [x] 3.1 Create `frontend/rishu-diital-chikitsak/src/services/queueService.js`
    - Import `supabase` from `./supabase`
    - Implement `generateToken({ patientId, priority })`:
      - Query `doctors` where `status = 'online'`; throw `{ code: 503 }` if none
      - For each online doctor, count their `waiting` tokens; pick doctor with minimum count
      - Compute `token_number` as `MAX(token_number) + 1` for that doctor (or 1 if empty)
      - Check for existing active token for patient; throw `{ code: 409 }` if found
      - Insert into `tokens` and return the created `TokenRecord`
    - Implement `getQueuePosition(tokenId, doctorId, myTokenNumber)`:
      - Count `waiting` tokens for `doctorId` with `token_number < myTokenNumber`
      - Return `{ position, estimatedWait: getEstimatedWait(position) }`
    - Implement `getEstimatedWait(position, avgConsultTime = 10)` — pure: `position * avgConsultTime`
    - Implement `getDoctorQueue(doctorId)`:
      - Query `tokens` where `doctor_id = doctorId` and `status = 'waiting'`
      - Sort by priority order (emergency → senior → child → general) then ascending `token_number`
    - Implement `callNext(doctorId)`:
      - Fetch first waiting token (priority-sorted, then lowest token_number)
      - Throw `{ code: 404 }` if queue empty
      - Generate `jitsi_room = 'chikitsak-' + token.id`
      - Update token: `status = 'in_consultation'`, `called_at = now()`, `jitsi_room`
      - Update doctor: `status = 'in_call'`, `current_patient_id = token.patient_id`
      - Return updated `TokenRecord`
    - Implement `markDone(tokenId, doctorId)`:
      - Update token: `status = 'done'`
      - Update doctor: `status = 'online'`, `current_patient_id = null`
    - Implement `updateDoctorStatus(doctorId, status)`:
      - Update `doctors` row where `id = doctorId`
    - Export `getJitsiRoomId(tokenId)` — pure: returns `'chikitsak-' + tokenId`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 5.3, 5.4, 5.5, 7.1, 8.2, 8.3_

  - [ ]* 3.2 Write unit tests for queue service pure functions
    - Create `frontend/rishu-diital-chikitsak/src/tests/queueService.unit.test.js`
    - Test `getEstimatedWait`: position 0 → 0, position 3 avgTime 10 → 30, position 1 avgTime 15 → 15
    - Test `getJitsiRoomId`: known UUID → `'chikitsak-' + uuid`
    - Test priority sort comparator: emergency < senior < child < general; same priority sorted by token_number
    - Test `getQueuePosition` logic with mock queue snapshots
    - _Requirements: 3.1, 3.2, 7.1, 9.1, 9.2_

- [x] 4. React hooks
  - [x] 4.1 Create `frontend/rishu-diital-chikitsak/src/hooks/useQueue.js`
    - Accept `(doctorId, myTokenId)` as parameters
    - On mount: fetch initial queue via `getDoctorQueue(doctorId)` and fetch patient's token by `myTokenId`
    - Subscribe to Supabase Realtime channel on `tokens` filtered by `doctor_id = doctorId`
    - On any INSERT/UPDATE event: re-fetch queue and recompute `myPosition`, `estimatedWait`, `isMyTurn`, `jitsiRoomId`
    - `isMyTurn` is true when patient's token `status === 'in_consultation'`
    - `jitsiRoomId` is set from `token.jitsi_room` when `isMyTurn`
    - On unmount: unsubscribe from all channels
    - Return `{ queue, myPosition, estimatedWait, isMyTurn, jitsiRoomId, loading, error }`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

  - [x] 4.2 Create `frontend/rishu-diital-chikitsak/src/hooks/useDoctorQueue.js`
    - Accept `(doctorId)` as parameter
    - On mount: fetch initial queue via `getDoctorQueue(doctorId)` and fetch doctor row
    - Subscribe to Supabase Realtime on `tokens` filtered by `doctor_id = doctorId`
    - Subscribe to Supabase Realtime on `doctors` filtered by `id = doctorId`
    - On any event: re-fetch queue and doctor status
    - Expose `callNext`, `markDone`, `setStatus` as async functions wrapping `queueService`
    - On unmount: unsubscribe from all channels
    - Return `{ queue, doctorStatus, callNext, markDone, setStatus, loading, error }`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.5_

- [x] 5. SymptomEntry component
  - [x] 5.1 Create `frontend/rishu-diital-chikitsak/src/components/SymptomEntry.jsx`
    - Props: `{ patientId, patientAge, onComplete(tokenRecord | jitsiRoomId) }`
    - Internal state machine: `idle → recording/typing → confirming → saving → calling_ml → deciding → done`
    - Text input: free-text symptom description with keyword extraction to symptom array
    - Voice input: Web Speech API with language fallback chain `pa-IN → hi-IN → en-IN`; disable mic button if `window.SpeechRecognition` and `window.webkitSpeechRecognition` are both undefined
    - Confirmation step: show extracted symptom array before proceeding
    - On confirm: `supabase.from('symptoms').insert({ patient_id, symptoms_json, ml_prediction: null })`
    - Call `POST http://localhost:5001/api/v1/predict` with 10-second timeout using `AbortController`
    - On ML success: update symptoms row with `ml_prediction`; on failure/timeout: log warning, proceed with null
    - Call `triage({ symptoms, age: patientAge })` to get priority
    - Check for online doctor with empty queue; if found: call `getJitsiRoomId` and call `onComplete(roomId)` without creating a token
    - Otherwise: call `generateToken({ patientId, priority })` and call `onComplete(tokenRecord)`
    - Show error toast on Supabase insert failure; do not navigate away
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 9.3_

- [x] 6. PatientTokensPage
  - [x] 6.1 Replace `frontend/rishu-diital-chikitsak/src/pages/patient/Tokens.jsx` with full implementation
    - Remove all existing axios calls and hardcoded doctor options
    - Read `patientId` and `doctorId` from router state or localStorage (set after `generateToken`)
    - If no active token: render `<SymptomEntry>` component to start the flow
    - After `SymptomEntry.onComplete`: store token in component state and switch to queue view
    - Use `useQueue(doctorId, myTokenId)` hook for live data
    - Display: token number, priority badge (color-coded: red=emergency, orange=senior, blue=child, green=general)
    - Display: live position in queue (e.g. "You are #3 in queue") and estimated wait in minutes
    - Display: doctor availability indicator (online/offline/break) from Supabase `doctors` table
    - When `isMyTurn === true`: show "Your Turn" banner and "Join Call" button linking to `https://meet.jit.si/{jitsiRoomId}`
    - When `token.status === 'done'`: show consultation complete message and hide queue info
    - Show "Reconnecting…" indicator when Supabase Realtime channel status is not `SUBSCRIBED`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 7.3, 9.4, 10.1, 10.2_

- [x] 7. DoctorTokensPage
  - [x] 7.1 Replace `frontend/rishu-diital-chikitsak/src/pages/doctor/Tokens.jsx` with full implementation
    - Remove all existing axios calls to `http://localhost:5000/api/doctor/tokens` and `http://localhost:5000/api/doctor/update-token`
    - Read `doctorId` from auth context / localStorage (doctor's Supabase UUID)
    - Use `useDoctorQueue(doctorId)` hook for live data
    - Status toggle: three buttons `Online` / `Break` / `Offline` calling `setStatus()`; highlight active status
    - Queue table columns: Token #, Patient Name, Priority (badge), Status
    - Priority badges: same color scheme as PatientTokensPage
    - "Call Next" button: disabled when `queue.length === 0` or `doctorStatus === 'in_call'`; calls `callNext()`
    - "Mark Done" button: visible only when `doctorStatus === 'in_call'`; calls `markDone(currentTokenId)`
    - "Join Call" button: visible when `doctorStatus === 'in_call'`; links to `https://meet.jit.si/{jitsiRoomId}`
    - Show error toast on `callNext` failure (empty queue) or `markDone` failure
    - Show "Reconnecting…" indicator when channel is not `SUBSCRIBED`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 7.4, 7.5, 8.1, 8.2, 8.3, 8.5, 9.5, 10.3_

- [x] 8. Router and integration wiring
  - [x] 8.1 Update `frontend/rishu-diital-chikitsak/src/router.jsx`
    - Import `PatientTokens` from `./pages/patient/Tokens`
    - Import `DoctorTokens` from `./pages/doctor/Tokens`
    - Replace `TemplatePage` stub at `/patient/tokens` with `<PatientTokens />`
    - Replace `TemplatePage` stub at `/doctor/tokens` with `<DoctorTokens />`
    - _Requirements: 10.5_

  - [x] 8.2 Verify navigation links to token pages exist in sidebars
    - Check `frontend/rishu-diital-chikitsak/src/components/PatientSidebar.jsx` — add link to `/patient/tokens` if missing
    - Check `frontend/rishu-diital-chikitsak/src/components/DoctorSidebar.jsx` — add link to `/doctor/tokens` if missing
    - _Requirements: 10.5_

- [x] 9. Remove mock and hardcoded logic from Flask backend
  - [x] 9.1 Update `backend/chikitsak-backend/app.py`
    - Locate the `/api/pharmacies` GET endpoint (currently returns `mock_pharmacies` hardcoded list)
    - Replace mock return with a Supabase query to the `pharmacies` table using `supabase_client.py`
    - If the Supabase `pharmacies` table is empty or the query fails, return `[]` (empty array) — never return hardcoded mock objects
    - Do NOT remove or modify any auth endpoints (`/api/register`, `/api/login`, JWT logic)
    - Do NOT remove or modify any other existing endpoints unrelated to tokens/queue
    - _Requirements: 10.4_

- [ ] 10. Checkpoint — Ensure all tests pass
  - Run `npx vitest run` from `frontend/rishu-diital-chikitsak/` and confirm all tests pass
  - Manually verify: navigate to `/patient/tokens`, enter symptoms, confirm token is created in Supabase dashboard
  - Manually verify: navigate to `/doctor/tokens`, confirm queue updates in real time when patient token is created
  - Manually verify: doctor clicks "Call Next", patient page shows "Your Turn" banner within 2 seconds
  - Manually verify: doctor clicks "Mark Done", both pages update and doctor status returns to `online`
  - Ask the user if any questions arise before proceeding

- [ ] 11. Integration smoke tests
  - [ ] 11.1 Create `frontend/rishu-diital-chikitsak/src/tests/queue.integration.test.js`
    - Use Vitest with Supabase test client (use the existing `supabase` instance from `src/services/supabase.js`)
    - Test: insert a token row directly via Supabase client; assert `useQueue` hook state updates within 2 seconds (use `waitFor` from `@testing-library/react`)
    - Test: update a doctor row status; assert `useDoctorQueue` hook reflects new status
    - Test: RLS policy — authenticate as patient A, attempt to read patient B's token, assert empty result
    - Test: `generateToken` called twice for same patient with active token → second call throws 409
    - Test: `callNext` on empty queue → throws 404
    - _Requirements: 4.2, 4.3, 4.5, 2.5, 5.7_

  - [ ]* 11.2 Write smoke test for schema correctness
    - Create `frontend/rishu-diital-chikitsak/src/tests/schema.smoke.test.js`
    - Query each of the four tables (`doctors`, `patients`, `tokens`, `symptoms`) and assert no error is returned (tables exist and are accessible)
    - Assert `tokens` table has columns: `id`, `token_number`, `patient_id`, `doctor_id`, `status`, `priority`, `jitsi_room`, `created_at`, `called_at`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The Supabase `patients` table in this feature is the Supabase-native one (UUID primary key); it is separate from the MySQL `patients` table used by Flask auth — they coexist
- The Flask backend at `:5000` continues to handle all auth (register/login/JWT); no Flask token/queue endpoints are needed
- The ML predictor at `:5001` is called client-side with a 10-second `AbortController` timeout
- All Supabase operations are protected by RLS; the frontend uses the anon key from `VITE_SUPABASE_PUBLISHABLE_KEY`
- Jitsi room IDs are deterministic: `chikitsak-{token_id}` — no room registry needed
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
