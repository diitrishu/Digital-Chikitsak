import { create } from 'zustand';

export const useConsultationStore = create((set) => ({
  step: 'input', // input | confirm | result | queue
  textInput: '',
  tappedSymptoms: [],
  extractedSymptoms: [],
  triageResult: null,
  mlResult: null,
  transcript: '',
  processing: false,
  processingMsg: '',

  setStep: (step) => set({ step }),
  setTextInput: (text) => set({ textInput: text }),
  toggleSymptom: (key) => set((state) => {
    const syms = [...state.tappedSymptoms];
    const idx = syms.indexOf(key);
    if (idx >= 0) syms.splice(idx, 1);
    else syms.push(key);
    return { tappedSymptoms: syms };
  }),
  setExtractedSymptoms: (syms) => set({ extractedSymptoms: syms }),
  removeSymptom: (sym) => set((state) => ({
    extractedSymptoms: state.extractedSymptoms.filter(s => s !== sym),
  })),
  setTriageResult: (result) => set({ triageResult: result }),
  setMlResult: (result) => set({ mlResult: result }),
  setTranscript: (t) => set({ transcript: t }),
  setProcessing: (val, msg = '') => set({ processing: val, processingMsg: msg }),

  reset: () => set({
    step: 'input', textInput: '', tappedSymptoms: [], extractedSymptoms: [],
    triageResult: null, mlResult: null, transcript: '', processing: false, processingMsg: '',
  }),
}));
