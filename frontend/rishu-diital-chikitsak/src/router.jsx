// src/router.jsx
import React from "react";
import { createBrowserRouter } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import SimpleRegistration from "./pages/SimpleRegistration";
import PatientDashboard from "./patient/pages/Dashboard";
import EnhancedSymptomChecker from "./patient/pages/SmartConsultation";
import FamilyMembers from "./patient/pages/Family";
import CompleteRegistration from "./pages/CompleteRegistration";
import TestPage from "./pages/TestPage";
import TemplatePage from "./shared/components/TemplatePage";
import PharmacyFinder from "./patient/pages/Pharmacy";
import BookDoctor from "./patient/pages/BookDoctor";
import Consultation from "./patient/pages/Consultation";
import HealthRecords from "./patient/pages/HealthRecords";
import MedicationReminders from "./patient/pages/Reminders";
import VoiceAssistance from "./patient/pages/VoiceAssistance";
import HealthEducation from "./patient/pages/HealthEducation";
import Settings from "./patient/pages/Settings";
// Import doctor consultation page
import DoctorConsultation from "./doctor/pages/Consultation";
import DoctorDashboard from "./doctor/pages/Dashboard";
import DoctorOnboarding from "./doctor/pages/Onboarding";
import DoctorPatients from "./doctor/pages/Patients";
import DoctorProfile from "./doctor/pages/Profile";
import DoctorChat from "./doctor/pages/Chat";
import DoctorInbox from "./doctor/pages/Inbox";
import PatientTokens from "./patient/pages/Tokens";
import DoctorTokens from "./doctor/pages/Queue";
import PatientChat from "./patient/pages/Chat";
import PatientChatList from "./patient/pages/ChatList";
import PostConsultation from "./doctor/pages/PostConsultation";

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/about", element: <TemplatePage title="About Digital Chikitsak" description="Learn more about our telemedicine platform" /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <SimpleRegistration /> },
  { path: "/test", element: <TestPage /> },
  { path: "/api-test", element: <TemplatePage title="API Test" description="System diagnostics and testing" /> },

  {
    path: "/patient",
    element: <PatientDashboard />
  },
  { path: "/patient/symptom-checker", element: <EnhancedSymptomChecker /> },
  { path: "/patient/symptom-analysis", element: <EnhancedSymptomChecker /> },
  { path: "/patient/book-doctor", element: <BookDoctor /> },
  { path: "/patient/consultation/:id", element: <Consultation /> },
  { path: "/patient/instant-consultation", element: <Consultation /> },
  { path: "/patient/pharmacy", element: <PharmacyFinder /> },
  { path: "/patient/family", element: <FamilyMembers /> },
  { path: "/patient/records", element: <HealthRecords /> },
  { path: "/patient/reminders", element: <MedicationReminders /> },
  { path: "/patient/voice-assistance", element: <VoiceAssistance /> },
  { path: "/patient/education", element: <HealthEducation /> },
  { path: "/patient/settings", element: <Settings /> },
  { path: "/patient/tokens", element: <PatientTokens /> },
  { path: "/patient/chats",  element: <PatientChatList /> },
  { path: "/patient/chat/:doctorId", element: <PatientChat /> },

  {
    path: "/doctor",
    element: <DoctorDashboard />
  },
  { path: "/doctor/onboarding",   element: <DoctorOnboarding /> },
  { path: "/doctor/queue",        element: <DoctorTokens /> },
  { path: "/doctor/patients",     element: <DoctorPatients /> },
  { path: "/doctor/profile",      element: <DoctorProfile /> },
  { path: "/doctor/consultation/:id", element: <DoctorConsultation /> },
  { path: "/doctor/tokens",       element: <DoctorTokens /> },
  { path: "/doctor/inbox",        element: <DoctorInbox /> },
  { path: "/doctor/chat/:patientId", element: <DoctorChat /> },
  { path: "/doctor/post-consultation/:tokenId", element: <PostConsultation /> },

  { path: "*", element: <TemplatePage title="Page Not Found" description="The page you're looking for doesn't exist" /> },
], {
  future: {
    v7_startTransition: true
  }
});

export default router;
