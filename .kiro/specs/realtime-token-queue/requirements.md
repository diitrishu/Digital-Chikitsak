# Requirements Document

## Introduction

Digital Chikitsak is a telemedicine platform serving rural Punjab. This feature replaces all hardcoded and mock token logic with a real-time token queue system backed by Supabase. Patients submit symptoms, receive a token when a doctor is unavailable, wait in a live queue with position and estimated wait time, and are called into a Jitsi video consultation when it is their turn. Doctors manage their availability and advance the queue with a single action. All queue state changes propagate to every connected client in real time via Supabase Realtime.

---

## Glossary

- **Token_Queue_System**: The complete real-time queue management feature described in this document.
- **Token**: A numbered record in the Supabase `tokens` table that represents one patient's place in a doctor's queue.
- **Queue**: The ordered list of tokens for a given doctor with `status = 'waiting'`, sorted ascending by `token_number`.
- **Token_Generator**: The backend service (Supabase Edge Function or Flask endpoint) responsible for creating tokens.
- **Queue_Service**: The backend service responsible for fetching queue state, computing position, and computing estimated wait time.
- **Realtime_Subscriber**: The React client-side module that subscribes to Supabase Realtime channel events on the `tokens` and `doctors` tables.
- **Doctor_Status**: An enumerated field on the `doctors` table with values `online`, `in_call`, `offline`, `break`.
- **Token_Status**: An enumerated field on the `tokens` table with values `waiting`, `in_consultation`, `done`.
- **Priority**: An enumerated field on the `tokens` table with values `emergency`, `senior`, `child`, `general`.
- **Patient**: A registered user with role `patient` in the platform.
- **Doctor**: A registered user with role `doctor` in the platform.
- **ML_API**: The Flask service running on port 5001 that accepts symptom input and returns a disease prediction.
- **Jitsi_Room**: A video call session hosted on `meet.jit.si`, identified by a deterministic room ID derived from the token UUID.
- **Avg_Consult_Time**: The average consultation duration in minutes used to compute estimated wait time; default value is 10 minutes.
- **PatientTokensPage**: The React page at `/patient/tokens` that replaces the current stub.
- **DoctorTokensPage**: The React page at `/doctor/tokens` that replaces the current stub.
- **SymptomEntry**: The UI flow where a patient inputs symptoms before a token is generated or an instant call is initiated.

---

## Requirements

### Requirement 1: Supabase Schema

**User Story:** As a developer, I want a well-defined Supabase schema, so that all token queue data is stored consistently and can be queried and subscribed to in real time.

#### Acceptance Criteria

1. THE Token_Queue_System SHALL maintain a `doctors` table with columns: `id` (uuid, primary key), `name` (text), `status` (Doctor_Status enum, default `offline`), `current_patient_id` (uuid, nullable foreign key to `patients.id`).
2. THE Token_Queue_System SHALL maintain a `patients` table with columns: `id` (uuid, primary key), `name` (text), `age` (integer), `phone` (text, unique), `created_at` (timestamptz, default now()).
3. THE Token_Queue_System SHALL maintain a `tokens` table with columns: `id` (uuid, primary key), `token_number` (integer, not null), `patient_id` (uuid, foreign key to `patients.id`), `doctor_id` (uuid, foreign key to `doctors.id`), `status` (Token_Status enum, default `waiting`), `priority` (Priority enum, default `general`), `created_at` (timestamptz, default now()), `called_at` (timestamptz, nullable).
4. THE Token_Queue_System SHALL maintain a `symptoms` table with columns: `id` (uuid, primary key), `patient_id` (uuid, foreign key to `patients.id`), `symptoms_json` (jsonb), `ml_prediction` (text, nullable), `created_at` (timestamptz, default now()).
5. THE Token_Queue_System SHALL enable Supabase Realtime publication on the `tokens` table and the `doctors` table so that INSERT, UPDATE, and DELETE events are broadcast to subscribers.
6. WHEN the `tokens` table is queried for a doctor's queue, THE Token_Queue_System SHALL return rows filtered by `doctor_id` and `status = 'waiting'` ordered ascending by `token_number`.

---

### Requirement 2: Token Generation

**User Story:** As a patient, I want a token to be automatically assigned to the doctor with the shortest queue, so that I am placed in the most efficient queue without manual selection.

#### Acceptance Criteria

1. WHEN a patient requests a token, THE Token_Generator SHALL query all doctors with `status = 'online'` and select the one with the fewest tokens where `status = 'waiting'`.
2. WHEN a target doctor is identified, THE Token_Generator SHALL compute `token_number` as `MAX(token_number) + 1` for that doctor's active queue, starting at 1 if the queue is empty.
3. WHEN `token_number` is computed, THE Token_Generator SHALL insert a new row into the `tokens` table with the patient's `patient_id`, the selected `doctor_id`, the computed `token_number`, the provided `priority`, and `status = 'waiting'`.
4. IF no doctor has `status = 'online'`, THEN THE Token_Generator SHALL return an error response with HTTP status 503 and a message indicating no doctors are currently available.
5. IF a patient already has a token with `status = 'waiting'` or `status = 'in_consultation'` for any doctor, THEN THE Token_Generator SHALL return an error response with HTTP status 409 and a message indicating a token already exists.
6. WHEN a token is successfully created, THE Token_Generator SHALL return the token record including `id`, `token_number`, `doctor_id`, `status`, and `priority`.

---

### Requirement 3: Queue Fetch and Position Calculation

**User Story:** As a patient, I want to see my current position in the queue and an estimated wait time, so that I can plan accordingly while waiting.

#### Acceptance Criteria

1. WHEN a patient requests their queue position, THE Queue_Service SHALL count the number of tokens with `status = 'waiting'` and `token_number` less than the patient's `token_number` for the same `doctor_id`.
2. THE Queue_Service SHALL compute estimated wait time as `position × Avg_Consult_Time` minutes.
3. WHEN the patient's token has `status = 'in_consultation'`, THE Queue_Service SHALL return position 0 and estimated wait time 0.
4. WHEN the patient's token has `status = 'done'`, THE Queue_Service SHALL return a response indicating the consultation is complete.
5. THE Queue_Service SHALL return the full ordered queue for a given `doctor_id` including each token's `token_number`, `patient_id`, `status`, and `priority`.

---

### Requirement 4: Real-Time Queue Updates

**User Story:** As a patient, I want my queue display to update automatically without refreshing the page, so that I always see the current state of the queue.

#### Acceptance Criteria

1. WHEN the PatientTokensPage mounts, THE Realtime_Subscriber SHALL open a Supabase Realtime channel subscription on the `tokens` table filtered by the patient's `doctor_id`.
2. WHEN a new token is inserted into the `tokens` table for the subscribed `doctor_id`, THE Realtime_Subscriber SHALL update the local queue state to reflect the new entry within 2 seconds of the database event.
3. WHEN a token's `status` changes to `done`, THE Realtime_Subscriber SHALL update the local queue state and recalculate the patient's position and estimated wait time within 2 seconds.
4. WHEN the patient's own token `status` changes to `in_consultation`, THE Realtime_Subscriber SHALL display a notification to the patient that it is their turn.
5. WHEN a doctor's `status` changes from `offline` or `break` to `online`, THE Realtime_Subscriber SHALL update the doctor availability indicator on the PatientTokensPage within 2 seconds.
6. WHEN the PatientTokensPage unmounts, THE Realtime_Subscriber SHALL unsubscribe from all active Supabase Realtime channels to prevent memory leaks.

---

### Requirement 5: Doctor Queue Management

**User Story:** As a doctor, I want to see my patient queue and call the next patient with one action, so that I can manage consultations efficiently.

#### Acceptance Criteria

1. WHEN the DoctorTokensPage mounts, THE Realtime_Subscriber SHALL open a Supabase Realtime channel subscription on the `tokens` table filtered by the doctor's `id`.
2. WHEN a new token is inserted for the doctor's queue, THE Realtime_Subscriber SHALL update the DoctorTokensPage queue list within 2 seconds.
3. WHEN a doctor clicks "Call Next", THE Token_Queue_System SHALL set the first `status = 'waiting'` token (lowest `token_number`) to `status = 'in_consultation'`, set `called_at` to the current timestamp, and set the doctor's `current_patient_id` to that token's `patient_id`.
4. WHEN a doctor clicks "Call Next", THE Token_Queue_System SHALL set the doctor's `status` to `in_call`.
5. WHEN a doctor marks a consultation as complete, THE Token_Queue_System SHALL set the token's `status` to `done`, set the doctor's `current_patient_id` to null, and set the doctor's `status` to `online`.
6. THE DoctorTokensPage SHALL display each token's `token_number`, patient name, `priority`, and `status`.
7. WHEN the queue is empty and the doctor clicks "Call Next", THE Token_Queue_System SHALL return an error response indicating no patients are waiting.

---

### Requirement 6: Symptom Entry and Triage Decision

**User Story:** As a patient, I want to enter my symptoms before joining the queue, so that the system can decide whether I need an instant video call or a queued token.

#### Acceptance Criteria

1. WHEN a patient submits symptoms via the SymptomEntry UI, THE Token_Queue_System SHALL store the symptoms as a JSON array in the `symptoms` table linked to the patient's `patient_id`.
2. WHEN symptoms are stored, THE Token_Queue_System SHALL call the ML_API at `POST /predict` with the symptoms payload and store the returned `ml_prediction` in the `symptoms` row.
3. WHEN the ML_API response is received and a doctor has `status = 'online'` with an empty queue, THE Token_Queue_System SHALL initiate an instant consultation by generating a Jitsi room ID and presenting the video call link to the patient without creating a token.
4. WHEN the ML_API response is received and no doctor is immediately available, THE Token_Queue_System SHALL invoke the Token_Generator to create a token and navigate the patient to the PatientTokensPage.
5. IF the ML_API call fails or times out after 10 seconds, THEN THE Token_Queue_System SHALL proceed with token generation using the raw symptom list as the prediction fallback.
6. THE SymptomEntry UI SHALL accept both text input and voice input for symptom description.

---

### Requirement 7: Video Consultation via Jitsi

**User Story:** As a patient and doctor, I want a video call to start automatically when the doctor calls the next patient, so that the consultation begins without manual link sharing.

#### Acceptance Criteria

1. WHEN a doctor clicks "Call Next" and a token transitions to `in_consultation`, THE Token_Queue_System SHALL generate a Jitsi room ID using the format `chikitsak-{token_id}`.
2. WHEN the Jitsi room ID is generated, THE Token_Queue_System SHALL store the room ID in the token record and broadcast it to the patient via the Realtime_Subscriber.
3. WHEN the patient's Realtime_Subscriber receives the `in_consultation` event with a room ID, THE PatientTokensPage SHALL display a "Join Call" button that opens `https://meet.jit.si/chikitsak-{token_id}`.
4. WHEN the doctor's DoctorTokensPage receives the `in_consultation` event, THE DoctorTokensPage SHALL display a "Join Call" button that opens `https://meet.jit.si/chikitsak-{token_id}`.
5. WHEN a consultation is marked complete, THE Token_Queue_System SHALL remove the "Join Call" button from both the PatientTokensPage and DoctorTokensPage.

---

### Requirement 8: Doctor Status Management

**User Story:** As a doctor, I want to set my availability status, so that patients are only queued to doctors who are ready to accept consultations.

#### Acceptance Criteria

1. THE DoctorTokensPage SHALL display a status control allowing the doctor to set their `status` to `online`, `break`, or `offline`.
2. WHEN a doctor sets their status to `online`, THE Token_Queue_System SHALL update the `doctors` table and broadcast the change via Supabase Realtime.
3. WHEN a doctor sets their status to `offline` or `break`, THE Token_Queue_System SHALL update the `doctors` table and broadcast the change via Supabase Realtime.
4. WHILE a doctor's `status` is `offline` or `break`, THE Token_Generator SHALL exclude that doctor from the available doctor selection query.
5. WHEN a doctor's `status` changes to `online` and there are tokens with `status = 'waiting'` in their queue, THE Realtime_Subscriber on the DoctorTokensPage SHALL display the pending queue count immediately.

---

### Requirement 9: Priority Handling

**User Story:** As a patient with an emergency or special condition, I want my token to be prioritised in the queue, so that I receive care sooner than general patients.

#### Acceptance Criteria

1. WHEN a token is created with `priority = 'emergency'`, THE Queue_Service SHALL sort that token before all non-emergency tokens in the queue display, regardless of `token_number`.
2. WHEN multiple tokens share the same `priority`, THE Queue_Service SHALL order them ascending by `token_number`.
3. THE Token_Generator SHALL accept a `priority` field in the token creation request with allowed values `emergency`, `senior`, `child`, `general`; if omitted, THE Token_Generator SHALL default to `general`.
4. THE PatientTokensPage SHALL display the patient's own `priority` label alongside their token number.
5. THE DoctorTokensPage SHALL display each patient's `priority` label in the queue list.

---

### Requirement 10: Replacing Existing Mock and Hardcoded Logic

**User Story:** As a developer, I want all hardcoded and mock token logic removed and replaced with the real Supabase-backed implementation, so that the application reflects actual data at all times.

#### Acceptance Criteria

1. THE Token_Queue_System SHALL replace the hardcoded doctor options (`Dr. Sharma`, `Dr. Verma`) in `PatientTokens.jsx` with a live query to the Supabase `doctors` table filtered by `status = 'online'`.
2. THE Token_Queue_System SHALL replace the `axios.post` call to `http://localhost:5000/api/patient/generate-token` in `PatientTokens.jsx` with a direct Supabase insert or Edge Function call.
3. THE Token_Queue_System SHALL replace the `axios.get` and `axios.post` calls in `DoctorTokens.jsx` with Supabase queries and real-time subscriptions.
4. THE Token_Queue_System SHALL replace the mock pharmacy data in `app.py` at `/api/pharmacies` with a query to the Supabase `pharmacies` table; WHERE no Supabase pharmacy data exists, THE Token_Queue_System SHALL return an empty array rather than hardcoded mock objects.
5. THE Token_Queue_System SHALL register the PatientTokensPage at route `/patient/tokens` and the DoctorTokensPage at route `/doctor/tokens` in `router.jsx`, replacing the current `TemplatePage` stubs.
