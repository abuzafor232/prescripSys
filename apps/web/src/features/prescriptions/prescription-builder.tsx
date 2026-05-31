"use client";

import { type FormEvent, type ReactNode, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowDownAZ,
  ArrowDown10,
  Ban,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eraser,
  FileText,
  Layers,
  Loader2,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Settings,
  Trash2,
  UserPlus,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  apiFetch,
  createPrescription,
  createPatient,
  fetchChambers,
  fetchDoctors,
  getApiErrorMessage,
  searchPatients,
  type CreatePrescriptionInput,
  type Prescription,
  type CreatePatientInput,
  type MedicineSearchResult,
  type Patient,
  type PatientGender
} from "@/lib/api";
import { DOSE_PATTERNS, MEAL_INSTRUCTIONS } from "@/lib/prescription-constants";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useSessionStore } from "@/stores/session-store";

type RxMedicine = {
  medicineId?: string;
  brandName: string;
  genericName?: string;
  strength?: string | null;
  dosageForm?: string | null;
  dose: string;
  duration: string;
  instruction: string;
};

type PatientFormState = {
  name: string;
  mobile: string;
  gender: PatientGender;
  dateOfBirth: string;
  ageYears: string;
  ageMonths: string;
  ageDays: string;
  bloodGroup: string;
  occupation: string;
  createPrescription: boolean;
};

type PanelKey =
  | "complaint"
  | "history"
  | "findings"
  | "investigation"
  | "diagnosis"
  | "medication"
  | "vision"
  | "advice"
  | "followUp"
  | "referral";

type NoteKey =
  | "complaint"
  | "history"
  | "findings"
  | "investigation"
  | "diagnosis"
  | "advice"
  | "followUp"
  | "referral";

type VisionState = {
  right: EyePower;
  left: EyePower;
  add: string;
  ipd: string;
  glassType: string;
  iopRight: string;
  iopLeft: string;
  note: string;
};

type EyePower = {
  sphere: string;
  cyl: string;
  axis: string;
  va: string;
};

type TriStateValue = "no" | "na" | "yes" | "";

type FindingsState = {
  bpSystolic: string;
  bpDiastolic: string;
  heightFeet: string;
  heightInch: string;
  heightCm: string;
  ofcCm: string;
  ofcInch: string;
  pulse: string;
  temperature: string;
  diabetes: TriStateValue;
  diabetesDetails: string;
  weight: string;
  pfr: string;
  respiratoryRate: string;
  rbs: string;
  fbs: string;
  twoHourAbf: string;
  spo2: string;
  foodAllergy: TriStateValue;
  foodAllergyDetails: string;
  medicineAllergy: TriStateValue;
  medicineAllergyDetails: string;
  pollenAllergy: TriStateValue;
  dustAllergy: TriStateValue;
  mitesAllergy: TriStateValue;
  otherAllergyDetails: string;
  gynaeMenarche: string;
  gynaeLmp: string;
  gynaeMpFirst: string;
  gynaeMpSecond: string;
  gynaeMcFirst: string;
  gynaeMcSecond: string;
  gynaeFlow: string;
  gynaeDysmenorrhoea: string;
  gynaeMarriedYears: string;
  gynaeMarriedMonths: string;
  gynaeMarriedDays: string;
  gynaeMarriageDate: string;
  gynaePara: string;
  gynaeGravida: string;
  gynaeParaNote: string;
  gynaeAlcYears: string;
  gynaeAlcMonths: string;
  gynaeAlcDays: string;
  gynaeEdd: string;
  gynaeNad: string;
  gynaeTenderness: string;
  gynaeAbdominalNote: string;
};

type ReferralEntry = {
  id: string;
  name: string;
  phone: string;
  specialty: string;
  additionalInfo: string;
  direction: "to" | "from";
};

type ReferralFormState = Omit<ReferralEntry, "id" | "direction">;

const initialPatientForm: PatientFormState = {
  name: "",
  mobile: "",
  gender: "MALE",
  dateOfBirth: "",
  ageYears: "",
  ageMonths: "",
  ageDays: "",
  bloodGroup: "",
  occupation: "",
  createPrescription: true
};

const initialNotes: Record<NoteKey, string> = {
  complaint: "",
  history: "",
  findings: "",
  investigation: "CBC\nS. Creatinine",
  diagnosis: "Acute URTI",
  advice: "Drink adequate water\nReview if fever persists",
  followUp: "",
  referral: ""
};

const emptyEyePower: EyePower = {
  sphere: "",
  cyl: "",
  axis: "",
  va: ""
};

const initialVision: VisionState = {
  right: emptyEyePower,
  left: emptyEyePower,
  add: "",
  ipd: "",
  glassType: "",
  iopRight: "",
  iopLeft: "",
  note: ""
};

const initialFindings: FindingsState = {
  bpSystolic: "",
  bpDiastolic: "",
  heightFeet: "",
  heightInch: "",
  heightCm: "",
  ofcCm: "",
  ofcInch: "",
  pulse: "",
  temperature: "",
  diabetes: "",
  diabetesDetails: "",
  weight: "",
  pfr: "",
  respiratoryRate: "",
  rbs: "",
  fbs: "",
  twoHourAbf: "",
  spo2: "",
  foodAllergy: "",
  foodAllergyDetails: "",
  medicineAllergy: "",
  medicineAllergyDetails: "",
  pollenAllergy: "",
  dustAllergy: "",
  mitesAllergy: "",
  otherAllergyDetails: "",
  gynaeMenarche: "",
  gynaeLmp: "",
  gynaeMpFirst: "",
  gynaeMpSecond: "",
  gynaeMcFirst: "",
  gynaeMcSecond: "",
  gynaeFlow: "",
  gynaeDysmenorrhoea: "",
  gynaeMarriedYears: "",
  gynaeMarriedMonths: "",
  gynaeMarriedDays: "",
  gynaeMarriageDate: "",
  gynaePara: "",
  gynaeGravida: "",
  gynaeParaNote: "",
  gynaeAlcYears: "",
  gynaeAlcMonths: "",
  gynaeAlcDays: "",
  gynaeEdd: "",
  gynaeNad: "",
  gynaeTenderness: "",
  gynaeAbdominalNote: ""
};

const initialReferralForm: ReferralFormState = {
  name: "",
  phone: "",
  specialty: "",
  additionalInfo: ""
};

const panelTitles: Record<PanelKey, string> = {
  complaint: "Complaint",
  history: "History",
  findings: "Findings",
  investigation: "Investigation",
  diagnosis: "Diagnosis",
  medication: "Medication",
  vision: "Vision, IOP, Glass",
  advice: "Advice",
  followUp: "Follow-Up",
  referral: "Referral"
};

const leftPanels: PanelKey[] = [
  "complaint",
  "history",
  "findings",
  "investigation",
  "diagnosis"
];

const rightPanels: PanelKey[] = [
  "medication",
  "vision",
  "advice",
  "followUp",
  "referral"
];

const genderOptions: Array<{ label: string; value: PatientGender }> = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Other", value: "OTHER" }
];

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const occupations = [
  "Service Holder",
  "Business",
  "Student",
  "Teacher",
  "Homemaker",
  "Farmer",
  "Retired",
  "Other"
];

const glassTypes = ["Distance", "Near", "Bifocal", "Progressive", "Contact Lens"];

const historyTabs = [
  "Medical",
  "Investigation",
  "Drug",
  "Surgery",
  "Family",
  "Personal"
] as const;

type HistoryTab = (typeof historyTabs)[number];

const medicationFavourites = [
  "AQUAFRESH LIQUIGEL PF EYE DROP 1%",
  "LUBGEL EYE DROP 1%/10ml",
  "OPTIMOX EYE DROP 0.5%/5ml",
  "PATADIN DS EYE DROP 0.2%/5ml"
];

const medicationAlphabetFilters = ["ALL", "A", "L", "O", "P"];
const medicationTypeFilters = ["Reset", "DROP"];

const diagnosisFavourites = [
  "Allergic Conjunctivitis",
  "ARC (r/e)",
  "Diabetes",
  "Dry eye"
];

const diagnosisAlphabetFilters = ["ALL", "A", "D"];

const emptyAlphabetFilters = ["ALL"];

export function PrescriptionBuilder() {
  const token = useSessionStore((state) => state.accessToken);
  const sessionUser = useSessionStore((state) => state.user);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [patientForm, setPatientForm] = useState<PatientFormState>(initialPatientForm);
  const [patientFormError, setPatientFormError] = useState("");
  const [medicineQuery, setMedicineQuery] = useState("");
  const [medicationNote, setMedicationNote] = useState("");
  const [medicines, setMedicines] = useState<RxMedicine[]>([]);
  const [notes, setNotes] = useState<Record<NoteKey, string>>(initialNotes);
  const [findings, setFindings] = useState<FindingsState>(initialFindings);
  const [vision, setVision] = useState<VisionState>(initialVision);
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [referralForm, setReferralForm] = useState<ReferralFormState>(initialReferralForm);
  const [followUpDate, setFollowUpDate] = useState("");
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [paperType, setPaperType] = useState<"default" | "alternate">("default");
  const [paperMenuOpen, setPaperMenuOpen] = useState(false);
  const [lastSavedPrescription, setLastSavedPrescription] = useState<Prescription | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    tone: "success" | "warning";
    text: string;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedPatientQuery = useDebounce(patientQuery.trim());
  const debouncedQuery = useDebounce(medicineQuery);
  const debouncedMedicineQuery = debouncedQuery.trim();
  const currentMedicineQuery = medicineQuery.trim();
  const showSearchPanel = currentMedicineQuery.length > 1 && Boolean(token);
  const waitingForDebounce = currentMedicineQuery !== debouncedMedicineQuery;

  const patientSearch = useQuery({
    queryKey: ["patient-search", debouncedPatientQuery, token],
    enabled: patientSearchOpen && debouncedPatientQuery.length > 1 && Boolean(token),
    queryFn: () => searchPatients(debouncedPatientQuery, token!)
  });

  const medicineSearch = useQuery({
    queryKey: ["medicine-search", debouncedMedicineQuery, token],
    enabled: debouncedMedicineQuery.length > 1 && Boolean(token),
    queryFn: () =>
      apiFetch<MedicineSearchResult[]>(
        `/medicines/search?q=${encodeURIComponent(debouncedMedicineQuery)}&limit=8`,
        { token }
      )
  });

  const doctorsQuery = useQuery({
    queryKey: ["doctors", token],
    enabled: Boolean(token),
    queryFn: () => fetchDoctors(token!)
  });

  const chambersQuery = useQuery({
    queryKey: ["chambers", token],
    enabled: Boolean(token),
    queryFn: () => fetchChambers(token!)
  });

  const searchResults = useMemo(() => {
    if (!showSearchPanel || waitingForDebounce) return [];
    return medicineSearch.data ?? [];
  }, [medicineSearch.data, showSearchPanel, waitingForDebounce]);
  const searchPending = showSearchPanel && (waitingForDebounce || medicineSearch.isFetching);

  const currentDoctor = useMemo(() => {
    const doctors = doctorsQuery.data ?? [];
    return doctors.find((doctor) => doctor.id === sessionUser?.doctorId) ?? doctors[0] ?? null;
  }, [doctorsQuery.data, sessionUser?.doctorId]);

  const currentChamber = useMemo(() => {
    const defaultChamber = currentDoctor?.chambers?.find((item) => item.isDefault)?.chamber;
    return defaultChamber ?? currentDoctor?.chambers?.[0]?.chamber ?? chambersQuery.data?.[0] ?? null;
  }, [chambersQuery.data, currentDoctor]);

  const registerPatient = useMutation({
    mutationFn: (input: CreatePatientInput) => {
      if (!token) throw new Error("Please sign in before registering a patient.");
      return createPatient(input, token);
    },
    onSuccess: (patient) => {
      if (patientForm.createPrescription) {
        setSelectedPatient(patient);
      }
      setPatientQuery("");
      setPatientSearchOpen(false);
      setRegistrationOpen(false);
      setPatientForm(initialPatientForm);
      setPatientFormError("");
    }
  });

  const createPrescriptionMutation = useMutation({
    mutationFn: ({
      input
    }: {
      input: CreatePrescriptionInput;
      printAfterSave: boolean;
    }) => {
      if (!token) throw new Error("Please sign in before saving a prescription.");
      return createPrescription(input, token);
    },
    onSuccess: (prescription, variables) => {
      setLastSavedPrescription(prescription);
      showStatus("success", `Prescription ${prescription.prescriptionNo} saved.`);
      if (variables.printAfterSave) {
        window.setTimeout(() => window.print(), 0);
      }
    },
    onError: (error) => {
      showStatus("warning", getApiErrorMessage(error));
    }
  });

  const patientSearchResults = patientSearch.data?.data ?? [];
  const isSavingPrescription = createPrescriptionMutation.isPending;

  function selectPatient(patient: Patient) {
    setSelectedPatient(patient);
    setPatientQuery("");
    setPatientSearchOpen(false);
    showStatus("success", `${patient.name} selected`);
  }

  function updatePatientForm(patch: Partial<PatientFormState>) {
    setPatientForm((current) => ({ ...current, ...patch }));
    setPatientFormError("");
  }

  function updateNote(key: NoteKey, value: string) {
    setNotes((current) => ({ ...current, [key]: value }));
  }

  function appendNote(key: NoteKey, value: string) {
    const text = value.trim();
    if (!text) return;

    setNotes((current) => {
      const existing = current[key].trim();
      return {
        ...current,
        [key]: existing ? `${existing}\n${text}` : text
      };
    });
  }

  function handlePatientRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = patientForm.name.trim();
    const mobile = patientForm.mobile.trim();
    const dateOfBirth = parsePatientDate(patientForm.dateOfBirth.trim());
    const ageYears = parseOptionalInteger(patientForm.ageYears);
    const ageMonths = parseOptionalInteger(patientForm.ageMonths);
    const ageDays = parseOptionalInteger(patientForm.ageDays);

    if (!name) {
      setPatientFormError("Patient name is required.");
      return;
    }

    if (!mobile) {
      setPatientFormError("Patient mobile is required.");
      return;
    }

    if (patientForm.dateOfBirth.trim() && !dateOfBirth) {
      setPatientFormError("Use DD/MM/YYYY for date of birth.");
      return;
    }

    if (!dateOfBirth && ageYears === undefined && ageMonths === undefined && ageDays === undefined) {
      setPatientFormError("Enter date of birth or age.");
      return;
    }

    registerPatient.mutate({
      name,
      phone: mobile.startsWith("+88") ? mobile : `+88${mobile}`,
      gender: patientForm.gender,
      dateOfBirth,
      ageYears,
      ageMonths,
      ageDays,
      bloodGroup: patientForm.bloodGroup || undefined
    });
  }

  function addMedicine(item: MedicineSearchResult) {
    setMedicines((current) => [
      ...current,
      {
        medicineId: item.id.startsWith("demo-") ? undefined : item.id,
        brandName: item.brandName,
        genericName: item.genericName,
        strength: item.strength,
        dosageForm: item.dosageForm,
        dose: "1+0+1",
        duration: "5 Days",
        instruction: "After Meal"
      }
    ]);
    setMedicineQuery("");
    searchInputRef.current?.focus();
  }

  function updateMedicine(index: number, patch: Partial<RxMedicine>) {
    setMedicines((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  }

  function addMedicineName(name: string) {
    const brandName = name.trim();
    if (!brandName) return;

    setMedicines((current) => [
      ...current,
      {
        brandName,
        dose: "1+0+1",
        duration: "5 Days",
        instruction: "After Meal"
      }
    ]);
    setMedicineQuery("");
  }

  function updateEye(side: "right" | "left", field: keyof EyePower, value: string) {
    setVision((current) => ({
      ...current,
      [side]: { ...current[side], [field]: value }
    }));
  }

  function updateVision(field: keyof Omit<VisionState, "right" | "left">, value: string) {
    setVision((current) => ({ ...current, [field]: value }));
  }

  function updateFindings(patch: Partial<FindingsState>) {
    setFindings((current) => ({ ...current, ...patch }));
  }

  function updateReferralForm(patch: Partial<ReferralFormState>) {
    setReferralForm((current) => ({ ...current, ...patch }));
  }

  function addReferral(direction: "to" | "from") {
    const name = referralForm.name.trim();
    const phone = referralForm.phone.trim();
    const specialty = referralForm.specialty.trim();
    const additionalInfo = referralForm.additionalInfo.trim();

    if (!name && !phone && !specialty && !additionalInfo) {
      showStatus("warning", "Enter referral details first.");
      return;
    }

    setReferrals((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        name,
        phone,
        specialty,
        additionalInfo,
        direction
      }
    ]);
    setReferralForm(initialReferralForm);
    showStatus("success", "Referral added.");
  }

  function clearPanel(panel: PanelKey) {
    if (panel === "medication") {
      setMedicines([]);
      setMedicationNote("");
      setMedicineQuery("");
    } else if (panel === "vision") {
      setVision(initialVision);
    } else if (panel === "findings") {
      setFindings(initialFindings);
      updateNote("findings", "");
    } else if (panel === "referral") {
      setReferrals([]);
      setReferralForm(initialReferralForm);
      updateNote("referral", "");
    } else {
      updateNote(panel, "");
      if (panel === "followUp") setFollowUpDate("");
    }
    showStatus("success", `${panelTitles[panel]} cleared`);
  }

  function clearAll() {
    setNotes({
      complaint: "",
      history: "",
      findings: "",
      investigation: "",
      diagnosis: "",
      advice: "",
      followUp: "",
      referral: ""
    });
    setMedicines([]);
    setMedicationNote("");
    setFindings(initialFindings);
    setVision(initialVision);
    setReferrals([]);
    setReferralForm(initialReferralForm);
    setFollowUpDate("");
    showStatus("success", "Prescription pad cleared");
  }

  function buildPrescriptionPayload(chamberId: string, doctorId?: string): CreatePrescriptionInput {
    const examination = buildFindingsText(findings, notes.findings);

    return {
      patientId: selectedPatient!.id,
      doctorId,
      chamberId,
      chiefComplaints: trimOrUndefined(notes.complaint),
      examination: trimOrUndefined(examination),
      diagnoses: splitTextLines(notes.diagnosis),
      investigations: splitTextLines(notes.investigation),
      medicines: medicines.map((item, index) => ({
        medicineId: item.medicineId,
        brandName: item.brandName,
        genericName: trimOrUndefined(item.genericName ?? ""),
        strength: item.strength,
        dosageForm: item.dosageForm,
        dose: item.dose,
        duration: item.duration,
        instruction: trimOrUndefined(item.instruction),
        sortOrder: index
      })),
      advice: trimOrUndefined(notes.advice),
      followUpDate: followUpDate || undefined,
      metadata: {
        source: "prescription-builder",
        paperType,
        rawSections: {
          history: notes.history,
          findings: notes.findings,
          investigation: notes.investigation,
          diagnosis: notes.diagnosis,
          medicationNote,
          followUp: notes.followUp,
          referral: notes.referral
        },
        findings,
        vision,
        referrals
      }
    };
  }

  function persistPrescription(printAfterSave: boolean) {
    if (!token) {
      showStatus("warning", "Sign in before saving this prescription.");
      return;
    }

    if (!selectedPatient) {
      showStatus("warning", "Select a patient before saving this prescription.");
      return;
    }

    if (!currentChamber) {
      showStatus("warning", "No chamber found for this account.");
      return;
    }

    const doctorId = currentDoctor?.id ?? sessionUser?.doctorId;
    if (!doctorId) {
      showStatus("warning", "No doctor profile found for this account.");
      return;
    }

    createPrescriptionMutation.mutate({
      input: buildPrescriptionPayload(currentChamber.id, doctorId),
      printAfterSave
    });
  }

  function saveAction(action: "draft" | "template" | "save-only" | "save-print") {
    if (action === "draft") {
      persistPrescription(false);
      return;
    }

    if (action === "template") {
      showStatus("success", "Template option is ready for backend persistence.");
      return;
    }

    if (action === "save-only") {
      persistPrescription(false);
      return;
    }

    persistPrescription(true);
  }

  function copyRx() {
    const text = buildPrescriptionText(
      selectedPatient,
      notes,
      medicines,
      medicationNote,
      findings,
      followUpDate,
      vision,
      referrals
    );
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    showStatus("success", "Prescription content copied.");
  }

  function showStatus(tone: "success" | "warning", text: string) {
    setStatusMessage({ tone, text });
  }

  function renderPanelBody(panel: PanelKey, mode: "pad" | "dialog" = "pad") {
    const textareaClass = cn(
      "border-0 bg-transparent shadow-none focus-visible:ring-1",
      mode === "dialog" ? "min-h-64" : "min-h-24"
    );

    if (panel === "medication") {
      return (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              className="bg-white pl-9 dark:bg-background"
              placeholder="Search brand or generic"
              value={medicineQuery}
              onChange={(event) => setMedicineQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults[0]) {
                  event.preventDefault();
                  addMedicine(searchResults[0]);
                }
              }}
            />
            {showSearchPanel ? (
              <div className="absolute z-30 mt-2 w-full rounded-md border bg-card p-1 shadow-soft">
                {searchPending ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching medicines
                  </div>
                ) : null}

                {!searchPending && medicineSearch.isError ? (
                  <div className="px-3 py-2 text-sm text-destructive">
                    {getApiErrorMessage(medicineSearch.error)}
                  </div>
                ) : null}

                {!searchPending && !medicineSearch.isError && searchResults.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No medicines found
                  </div>
                ) : null}

                {!searchPending && !medicineSearch.isError
                  ? searchResults.map((item) => (
                      <button
                        key={item.id}
                        className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => addMedicine(item)}
                        type="button"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{item.brandName}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.genericName} {item.strength}
                          </span>
                        </span>
                        <Plus className="h-4 w-4 flex-none" />
                      </button>
                    ))
                  : null}
              </div>
            ) : currentMedicineQuery.length > 1 ? (
              <div className="absolute z-30 mt-2 w-full rounded-md border bg-card p-1 shadow-soft">
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Sign in to search medicines
                </div>
              </div>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-[1.2fr_108px_108px_132px_40px] gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
                <span>Medicine</span>
                <span>Dose</span>
                <span>Duration</span>
                <span>Instruction</span>
                <span />
              </div>
              <div className="space-y-2 pt-2">
                {medicines.length === 0 ? (
                  <div className="rounded-md border border-dashed bg-background/70 px-3 py-3 text-sm text-muted-foreground">
                    No medicine added
                  </div>
                ) : null}
                {medicines.map((item, index) => (
                  <div
                    key={`${item.brandName}-${index}`}
                    className="grid grid-cols-[1.2fr_108px_108px_132px_40px] items-center gap-2"
                  >
                    <div className="min-h-9 rounded-md border bg-background px-3 py-2 text-sm">
                      <div className="font-medium">{item.brandName}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.genericName} {item.strength}
                      </div>
                    </div>
                    <Input
                      value={item.dose}
                      list="dose-patterns"
                      onChange={(event) => updateMedicine(index, { dose: event.target.value })}
                    />
                    <Input
                      value={item.duration}
                      onChange={(event) =>
                        updateMedicine(index, { duration: event.target.value })
                      }
                    />
                    <Input
                      value={item.instruction}
                      list="meal-instructions"
                      onChange={(event) =>
                        updateMedicine(index, { instruction: event.target.value })
                      }
                    />
                    <Button
                      aria-label="Remove medicine"
                      title="Remove medicine"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setMedicines((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (panel === "vision") {
      return (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <div className="min-w-[620px] rounded-md border bg-background">
              <div className="grid grid-cols-[120px_repeat(4,minmax(90px,1fr))] border-b text-center text-sm font-semibold">
                <div className="border-r px-2 py-2">##</div>
                <div className="border-r px-2 py-2">Sphere</div>
                <div className="border-r px-2 py-2">CYL</div>
                <div className="border-r px-2 py-2">Axis</div>
                <div className="px-2 py-2">VA</div>
              </div>
              {(["right", "left"] as const).map((side) => (
                <div
                  key={side}
                  className="grid grid-cols-[120px_repeat(4,minmax(90px,1fr))] border-b last:border-b-0"
                >
                  <div className="flex items-center justify-center border-r px-2 py-2 text-sm">
                    {side === "right" ? "Right Eye" : "Left Eye"}
                  </div>
                  {(["sphere", "cyl", "axis", "va"] as const).map((field) => (
                    <div key={field} className="border-r p-2 last:border-r-0">
                      <Input
                        value={vision[side][field]}
                        onChange={(event) => updateEye(side, field, event.target.value)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <LabeledField label="ADD">
              <Input value={vision.add} onChange={(event) => updateVision("add", event.target.value)} />
            </LabeledField>
            <LabeledField label="IPD">
              <Input value={vision.ipd} onChange={(event) => updateVision("ipd", event.target.value)} />
            </LabeledField>
            <LabeledField label="Glass">
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
                value={vision.glassType}
                onChange={(event) => updateVision("glassType", event.target.value)}
              >
                <option value="">Select Eye Glass Type</option>
                {glassTypes.map((glassType) => (
                  <option key={glassType} value={glassType}>
                    {glassType}
                  </option>
                ))}
              </select>
            </LabeledField>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <LabeledField label="IOP (Right Eye)">
              <div className="flex">
                <Input
                  className="rounded-r-none"
                  value={vision.iopRight}
                  onChange={(event) => updateVision("iopRight", event.target.value)}
                />
                <span className="inline-flex h-9 items-center rounded-r-md border border-l-0 bg-muted px-3 text-sm">
                  mmHg
                </span>
              </div>
            </LabeledField>
            <LabeledField label="IOP (Left Eye)">
              <div className="flex">
                <Input
                  className="rounded-r-none"
                  value={vision.iopLeft}
                  onChange={(event) => updateVision("iopLeft", event.target.value)}
                />
                <span className="inline-flex h-9 items-center rounded-r-md border border-l-0 bg-muted px-3 text-sm">
                  mmHg
                </span>
              </div>
            </LabeledField>
          </div>

          <Textarea
            className="min-h-16 bg-background"
            placeholder="Type additional information..."
            value={vision.note}
            onChange={(event) => updateVision("note", event.target.value)}
          />
        </div>
      );
    }

    if (panel === "followUp") {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <Input
              type="date"
              value={followUpDate}
              onChange={(event) => setFollowUpDate(event.target.value)}
            />
          </div>
          <Textarea
            className={textareaClass}
            placeholder="Follow-up note"
            value={notes.followUp}
            onChange={(event) => updateNote("followUp", event.target.value)}
          />
        </div>
      );
    }

    return (
      <Textarea
        className={textareaClass}
        placeholder={`Type ${panelTitles[panel].toLowerCase()}...`}
        value={notes[panel]}
        onChange={(event) => updateNote(panel, event.target.value)}
      />
    );
  }

  function renderPanelPreview(panel: PanelKey) {
    if (panel === "medication") {
      return medicines.length ? (
        <div className="mt-4 max-h-16 overflow-hidden text-sm text-slate-700">
          {medicines.map((item) => item.brandName).join(", ")}
        </div>
      ) : null;
    }

    if (panel === "vision") {
      const values = [
        vision.right.sphere,
        vision.right.cyl,
        vision.left.sphere,
        vision.left.cyl,
        vision.iopRight,
        vision.iopLeft,
        vision.note
      ].filter(Boolean);
      return values.length ? (
        <div className="mt-4 line-clamp-2 text-sm text-slate-700">
          {values.join(" / ")}
        </div>
      ) : null;
    }

    if (panel === "followUp") {
      const value = [followUpDate, notes.followUp].filter(Boolean).join(" ");
      return value ? <div className="mt-4 line-clamp-2 text-sm text-slate-700">{value}</div> : null;
    }

    const value = notes[panel];
    return value ? (
      <div className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">
        {value}
      </div>
    ) : null;
  }

  function panelHasContent(panel: PanelKey) {
    if (panel === "medication") return medicines.length > 0 || Boolean(medicationNote.trim());

    if (panel === "findings") {
      return findingsHasContent(findings) || Boolean(notes.findings.trim());
    }

    if (panel === "vision") {
      return Object.values(vision.right).some(Boolean)
        || Object.values(vision.left).some(Boolean)
        || Boolean(vision.add)
        || Boolean(vision.ipd)
        || Boolean(vision.glassType)
        || Boolean(vision.iopRight)
        || Boolean(vision.iopLeft)
        || Boolean(vision.note.trim());
    }

    if (panel === "followUp") {
      return Boolean(followUpDate || notes.followUp.trim());
    }

    if (panel === "referral") {
      return referrals.length > 0 || Boolean(notes.referral.trim());
    }

    return Boolean(notes[panel].trim());
  }

  return (
    <>
      <div className="space-y-4 pb-20">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">New Prescription</h1>
            <p className="text-sm text-muted-foreground">
              {currentChamber?.name ?? (chambersQuery.isLoading ? "Loading chamber" : "No chamber selected")}
              {currentDoctor ? ` - ${currentDoctor.displayName}` : ""}
              {lastSavedPrescription ? ` - Saved ${lastSavedPrescription.prescriptionNo}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => showStatus("success", "All drafts option selected.")}>
              <FileText className="h-4 w-4" />
              All Drafts
            </Button>
            <Button variant="outline" onClick={() => showStatus("success", "All templates option selected.")}>
              <Layers className="h-4 w-4" />
              All Template
            </Button>
            <Button variant="outline" onClick={copyRx}>
              <Copy className="h-4 w-4" />
              Copy Rx
            </Button>
          </div>
        </div>

        <section className="overflow-hidden rounded-md border bg-card shadow-soft">
          <div className="border-b p-3">
            {selectedPatient ? (
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_140px_120px]">
                <PatientSummaryItem label="Patient Name" value={selectedPatient.name} />
                <PatientSummaryItem label="Mobile" value={selectedPatient.phone ?? "Not set"} />
                <PatientSummaryItem label="Age" value={formatPatientAge(selectedPatient)} />
                <PatientSummaryItem
                  label="Blood Group"
                  value={selectedPatient.bloodGroup ?? "Not set"}
                />
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-primary/70 bg-primary/5 px-4 py-3 text-sm">
                <span className="font-semibold">No patient selected.</span>{" "}
                <span>To save this prescription, select a patient first.</span>
              </div>
            )}

            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start">
              <div className="relative flex-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Patient Search"
                      value={patientQuery}
                      onChange={(event) => {
                        setPatientQuery(event.target.value);
                        setPatientSearchOpen(true);
                      }}
                      onFocus={() => setPatientSearchOpen(true)}
                    />
                  </div>
                  <Button type="button" onClick={() => setPatientSearchOpen(true)}>
                    <Search className="h-4 w-4" />
                    Search
                  </Button>
                </div>

                {patientSearchOpen && patientQuery.trim().length > 1 ? (
                  <div className="absolute z-40 mt-2 w-full rounded-md border bg-card p-1 shadow-soft">
                    {patientSearch.isFetching ? (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching patients
                      </div>
                    ) : null}

                    {!patientSearch.isFetching && patientSearch.isError ? (
                      <div className="px-3 py-2 text-sm text-destructive">
                        {getApiErrorMessage(patientSearch.error)}
                      </div>
                    ) : null}

                    {!patientSearch.isFetching &&
                    !patientSearch.isError &&
                    patientSearchResults.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No patient found
                      </div>
                    ) : null}

                    {!patientSearch.isFetching && !patientSearch.isError
                      ? patientSearchResults.map((patient) => (
                          <button
                            key={patient.id}
                            className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => selectPatient(patient)}
                            type="button"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{patient.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {patient.phone ?? patient.registrationNo}
                              </span>
                            </span>
                            <Check className="h-4 w-4 flex-none" />
                          </button>
                        ))
                      : null}
                  </div>
                ) : null}
              </div>

              <Button type="button" onClick={() => setRegistrationOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Register New Patient
              </Button>
            </div>
          </div>

          {statusMessage ? (
            <div
              className={cn(
                "border-b px-4 py-2 text-sm",
                statusMessage.tone === "warning"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-primary/30 bg-primary/10 text-primary"
              )}
            >
              {statusMessage.text}
            </div>
          ) : null}

          <div
            className="relative min-h-[50rem] p-4"
            style={{
              backgroundImage:
                "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
              backgroundSize: "22px 22px"
            }}
          >
            <div className="no-print absolute left-3 top-6 hidden w-11 flex-col overflow-hidden rounded-md border bg-card shadow-soft md:flex">
              <FloatingPadButton title="All Drafts" onClick={() => showStatus("success", "All drafts option selected.")}>
                <FileText className="h-4 w-4" />
              </FloatingPadButton>
              <FloatingPadButton title="All Template" onClick={() => showStatus("success", "All templates option selected.")}>
                <Layers className="h-4 w-4" />
              </FloatingPadButton>
              <FloatingPadButton title="Clear All" onClick={clearAll}>
                <Eraser className="h-4 w-4" />
              </FloatingPadButton>
              <FloatingPadButton title="Copy Rx" onClick={copyRx}>
                <Copy className="h-4 w-4" />
              </FloatingPadButton>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:pl-12">
              <div className="md:border-r md:pr-4">
                {leftPanels.map((panel) => (
                  <PrescriptionOptionTile
                    key={panel}
                    title={panelTitles[panel]}
                    hasContent={panelHasContent(panel)}
                    onClear={() => clearPanel(panel)}
                    onOpen={() => setActivePanel(panel)}
                  />
                ))}
              </div>

              <div>
                {rightPanels.map((panel) => (
                  <PrescriptionOptionTile
                    key={panel}
                    title={panelTitles[panel]}
                    hasContent={panelHasContent(panel)}
                    onClear={() => clearPanel(panel)}
                    onOpen={() => setActivePanel(panel)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <datalist id="dose-patterns">
          {DOSE_PATTERNS.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <datalist id="meal-instructions">
          {MEAL_INSTRUCTIONS.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </div>

      <nav className="no-print sticky bottom-0 z-30 -mx-4 border bg-background/95 px-4 py-2 shadow-soft backdrop-blur lg:-mx-6 lg:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Button
            aria-label="Toggle patient sidebar"
            title="Toggle patient sidebar"
            size="icon"
            variant="outline"
            onClick={() => setPatientSearchOpen((current) => !current)}
          >
            <Search className="h-4 w-4" />
          </Button>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => showStatus("success", "Settings option selected.")}>
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Button disabled={isSavingPrescription} variant="outline" onClick={() => saveAction("draft")}>
              {isSavingPrescription ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save as <strong>Draft</strong>
            </Button>
            <Button variant="outline" onClick={() => saveAction("template")}>
              Save as <strong>Template</strong>
            </Button>
            <div className="relative flex">
              <Button
                className="rounded-r-none"
                disabled={isSavingPrescription}
                onClick={() => saveAction("save-print")}
              >
                {isSavingPrescription ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                Save & Print
              </Button>
              <Button
                aria-label="Save print options"
                title="Save print options"
                className="rounded-l-none border-l border-primary-foreground/30 px-2"
                disabled={isSavingPrescription}
                onClick={() => setPaperMenuOpen((current) => !current)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>

              {paperMenuOpen ? (
                <div className="absolute bottom-full right-0 mb-2 w-56 rounded-md border bg-card p-2 shadow-soft">
                  <button
                    className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                    disabled={isSavingPrescription}
                    type="button"
                    onClick={() => {
                      saveAction("save-only");
                      setPaperMenuOpen(false);
                    }}
                  >
                    Save Only
                  </button>
                  <div className="my-1 border-t" />
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted">
                    <input
                      checked={paperType === "default"}
                      className="accent-primary"
                      name="paperType"
                      type="radio"
                      onChange={() => setPaperType("default")}
                    />
                    Default Paper
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted">
                    <input
                      checked={paperType === "alternate"}
                      className="accent-primary"
                      name="paperType"
                      type="radio"
                      onChange={() => setPaperType("alternate")}
                    />
                    Alternate Paper
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </nav>

      {activePanel === "complaint" ? (
        <ComplaintSidebar
          value={notes.complaint}
          onAddTag={(tag) => appendNote("complaint", tag)}
          onChange={(value) => updateNote("complaint", value)}
          onClear={() => clearPanel("complaint")}
          onClose={() => setActivePanel(null)}
        />
      ) : activePanel === "history" ? (
        <HistorySidebar
          value={notes.history}
          onAddTag={(tag) => appendNote("history", tag)}
          onChange={(value) => updateNote("history", value)}
          onClear={() => clearPanel("history")}
          onClose={() => setActivePanel(null)}
        />
      ) : activePanel === "findings" ? (
        <FindingsSidebar
          findings={findings}
          note={notes.findings}
          onChange={updateFindings}
          onClear={() => clearPanel("findings")}
          onClose={() => setActivePanel(null)}
          onNoteChange={(value) => updateNote("findings", value)}
        />
      ) : activePanel === "medication" ? (
        <MedicationSidebar
          medicines={medicines}
          query={medicineQuery}
          searchPending={searchPending}
          searchResults={searchResults}
          showSearchPanel={showSearchPanel}
          value={medicationNote}
          waitingForDebounce={waitingForDebounce}
          onAddMedicine={addMedicine}
          onAddMedicineName={addMedicineName}
          onChange={setMedicationNote}
          onClear={() => clearPanel("medication")}
          onClose={() => setActivePanel(null)}
          onQueryChange={setMedicineQuery}
          onStatus={showStatus}
        />
      ) : activePanel === "advice" ? (
        <TagNoteSidebar
          addCustomLabel="Add Custom Advice"
          alphabetFilters={emptyAlphabetFilters}
          emptyMessage="No favourites found."
          favourites={[]}
          title="Advice"
          value={notes.advice}
          onAddTag={(tag) => appendNote("advice", tag)}
          onChange={(value) => updateNote("advice", value)}
          onClear={() => clearPanel("advice")}
          onClose={() => setActivePanel(null)}
          onStatus={showStatus}
        />
      ) : activePanel === "investigation" ? (
        <TagNoteSidebar
          addCustomLabel="Add Custom Investigation"
          alphabetFilters={emptyAlphabetFilters}
          emptyMessage="No favourites found."
          favourites={[]}
          title="Investigation"
          value={notes.investigation}
          onAddTag={(tag) => appendNote("investigation", tag)}
          onChange={(value) => updateNote("investigation", value)}
          onClear={() => clearPanel("investigation")}
          onClose={() => setActivePanel(null)}
          onStatus={showStatus}
        />
      ) : activePanel === "diagnosis" ? (
        <TagNoteSidebar
          alphabetFilters={diagnosisAlphabetFilters}
          emptyMessage="No favourite diagnoses found."
          favourites={diagnosisFavourites}
          title="Diagnosis"
          value={notes.diagnosis}
          onAddTag={(tag) => appendNote("diagnosis", tag)}
          onChange={(value) => updateNote("diagnosis", value)}
          onClear={() => clearPanel("diagnosis")}
          onClose={() => setActivePanel(null)}
          onStatus={showStatus}
        />
      ) : activePanel === "followUp" ? (
        <FollowUpSidebar
          date={followUpDate}
          note={notes.followUp}
          onClose={() => setActivePanel(null)}
          onDateChange={setFollowUpDate}
          onNoteChange={(value) => updateNote("followUp", value)}
        />
      ) : activePanel === "referral" ? (
        <ReferralSidebar
          form={referralForm}
          referrals={referrals}
          onAddReferral={addReferral}
          onClose={() => setActivePanel(null)}
          onRemoveReferral={(id) =>
            setReferrals((current) => current.filter((item) => item.id !== id))
          }
          onUpdateForm={updateReferralForm}
        />
      ) : activePanel ? (
        <PanelDialog
          title={panelTitles[activePanel]}
          onClose={() => setActivePanel(null)}
        >
          {renderPanelBody(activePanel, "dialog")}
        </PanelDialog>
      ) : null}

      {registrationOpen ? (
        <PatientRegistrationDialog
          error={patientFormError || (registerPatient.isError ? getApiErrorMessage(registerPatient.error) : "")}
          form={patientForm}
          isSaving={registerPatient.isPending}
          onClose={() => setRegistrationOpen(false)}
          onSubmit={handlePatientRegistration}
          onUpdate={updatePatientForm}
        />
      ) : null}
    </>
  );
}

type ComplaintSidebarProps = {
  value: string;
  onAddTag: (tag: string) => void;
  onChange: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
};

function ComplaintSidebar({
  value,
  onAddTag,
  onChange,
  onClear,
  onClose
}: ComplaintSidebarProps) {
  const [query, setQuery] = useState("");

  function addSearchText() {
    const text = query.trim();
    if (!text) return;
    onAddTag(text);
    setQuery("");
  }

  return (
    <div className="fixed inset-0 z-50 bg-foreground/20" onClick={onClose}>
      <aside
        className="ml-auto flex h-full w-full flex-col border-l bg-card shadow-soft md:w-[60%]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex h-12 items-center justify-between gap-3 border-b bg-card px-4">
          <h2 className="text-base font-semibold text-primary">Complaint</h2>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={onClose}>
              <Check className="h-4 w-4" />
              Done
            </Button>
            <Button
              aria-label="Close complaint"
              size="icon"
              title="Close complaint"
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              <X className="h-5 w-5 text-destructive" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">
            <Input
              autoFocus
              className="h-14 border-primary/50 text-lg focus-visible:ring-primary"
              placeholder="Search..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addSearchText();
                }
              }}
            />

            <div className="space-y-2 border-t pt-3">
              <Textarea
                className="min-h-28 resize-y bg-background"
                placeholder="Type here..."
                value={value}
                onChange={(event) => onChange(event.target.value)}
              />
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <button
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                  type="button"
                  onClick={onClear}
                >
                  <RotateCcw className="h-4 w-4" />
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

type HistorySidebarProps = {
  value: string;
  onAddTag: (tag: string) => void;
  onChange: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
};

function HistorySidebar({
  value,
  onAddTag,
  onChange,
  onClear,
  onClose
}: HistorySidebarProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<HistoryTab>("Medical");

  function addSearchText() {
    const text = query.trim();
    if (!text) return;
    onAddTag(text);
    setQuery("");
  }

  function goToNextTab() {
    const currentIndex = historyTabs.indexOf(tab);
    setTab(historyTabs[(currentIndex + 1) % historyTabs.length]);
  }

  return (
    <div className="fixed inset-0 z-50 bg-foreground/20" onClick={onClose}>
      <aside
        className="ml-auto flex h-full w-full flex-col border-l bg-card shadow-soft md:w-[60%]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex h-12 items-center justify-between gap-3 border-b bg-card px-4">
          <h2 className="text-base font-semibold text-primary">History</h2>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={onClose}>
              <Check className="h-4 w-4" />
              Done
            </Button>
            <Button
              aria-label="Close history"
              size="icon"
              title="Close history"
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              <X className="h-5 w-5 text-destructive" />
            </Button>
          </div>
        </div>

        <div className="flex items-center border-b">
          <div className="flex min-w-0 flex-1 overflow-x-auto">
            {historyTabs.map((item) => (
              <TabButton
                key={item}
                active={tab === item}
                onClick={() => setTab(item)}
              >
                {item}
              </TabButton>
            ))}
          </div>
          <button
            aria-label="Next history tab"
            className="flex h-16 w-12 flex-none items-center justify-center border-l text-primary hover:bg-muted"
            title="Next history tab"
            type="button"
            onClick={goToNextTab}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto px-6 py-8">
          <Input
            autoFocus
            className="h-12 text-lg"
            placeholder="Search..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addSearchText();
              }
            }}
          />

          <div className="mt-5">
            <Textarea
              className="min-h-32 resize-y bg-background"
              placeholder="Type here..."
              value={value}
              onChange={(event) => onChange(event.target.value)}
            />
            <button
              className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              type="button"
              onClick={onClear}
            >
              <RotateCcw className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

type FindingsSidebarProps = {
  findings: FindingsState;
  note: string;
  onChange: (patch: Partial<FindingsState>) => void;
  onClear: () => void;
  onClose: () => void;
  onNoteChange: (value: string) => void;
};

function FindingsSidebar({
  findings,
  note,
  onChange,
  onClear,
  onClose,
  onNoteChange
}: FindingsSidebarProps) {
  const [tab, setTab] = useState<"Basic" | "Other" | "Gynae & Obs">("Basic");

  return (
    <RightDrawer title="Findings" onClose={onClose}>
      <div className="space-y-6">
        <div className="border-b">
          <div className="flex min-w-0 overflow-x-auto">
            {(["Basic", "Other", "Gynae & Obs"] as const).map((item) => (
              <TabButton key={item} active={tab === item} onClick={() => setTab(item)}>
                {item}
              </TabButton>
            ))}
          </div>
        </div>

        {tab === "Basic" ? (
          <div className="overflow-hidden rounded-md border bg-card shadow-sm">
            <FindingsSection title="Preliminary">
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-4">
                  <div className="space-y-1">
                    <FieldLabel>B. Pressure</FieldLabel>
                    <div className="grid grid-cols-2 overflow-hidden rounded-md border">
                      <Input
                        className="rounded-none border-0 border-r"
                        placeholder="up"
                        value={findings.bpSystolic}
                        onChange={(event) => onChange({ bpSystolic: event.target.value })}
                      />
                      <Input
                        className="rounded-none border-0"
                        placeholder="down"
                        value={findings.bpDiastolic}
                        onChange={(event) => onChange({ bpDiastolic: event.target.value })}
                      />
                    </div>
                  </div>
                  <FindingInput
                    label="Temp."
                    value={findings.temperature}
                    onChange={(value) => onChange({ temperature: value })}
                  />
                  <FindingInput
                    label="Pulse"
                    value={findings.pulse}
                    onChange={(value) => onChange({ pulse: value })}
                  />
                  <FindingInput
                    label="SpO2"
                    value={findings.spo2}
                    onChange={(value) => onChange({ spo2: value })}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <FindingInput
                    label="Weight (kg)"
                    value={findings.weight}
                    onChange={(value) => onChange({ weight: value })}
                  />
                  <div className="space-y-1">
                    <FieldLabel>Height</FieldLabel>
                    <div className="grid grid-cols-[1fr_1fr_auto_1fr] items-center gap-2">
                      <Input
                        placeholder="feet"
                        value={findings.heightFeet}
                        onChange={(event) => onChange({ heightFeet: event.target.value })}
                      />
                      <Input
                        placeholder="inch"
                        value={findings.heightInch}
                        onChange={(event) => onChange({ heightInch: event.target.value })}
                      />
                      <span className="text-lg font-semibold">/</span>
                      <Input
                        placeholder="cm"
                        value={findings.heightCm}
                        onChange={(event) => onChange({ heightCm: event.target.value })}
                      />
                    </div>
                  </div>
                  <FindingInput
                    label="Respiratory Rate"
                    value={findings.respiratoryRate}
                    onChange={(value) => onChange({ respiratoryRate: value })}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <FindingInput
                    label="RBS"
                    value={findings.rbs}
                    onChange={(value) => onChange({ rbs: value })}
                  />
                  <FindingInput
                    label="FBS"
                    value={findings.fbs}
                    onChange={(value) => onChange({ fbs: value })}
                  />
                  <FindingInput
                    label="2-Hrs-ABF"
                    value={findings.twoHourAbf}
                    onChange={(value) => onChange({ twoHourAbf: value })}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="space-y-1">
                    <FieldLabel>OFC</FieldLabel>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="cm"
                        value={findings.ofcCm}
                        onChange={(event) => onChange({ ofcCm: event.target.value })}
                      />
                      <Input
                        placeholder="inch"
                        value={findings.ofcInch}
                        onChange={(event) => onChange({ ofcInch: event.target.value })}
                      />
                    </div>
                  </div>
                  <FindingInput
                    label="PFR (L/min.)"
                    value={findings.pfr}
                    onChange={(value) => onChange({ pfr: value })}
                  />
                  <div className="space-y-1">
                    <FieldLabel>Diabetes</FieldLabel>
                    <div className="flex gap-2">
                      <TriStateControl
                        value={findings.diabetes}
                        onChange={(value) => onChange({ diabetes: value })}
                      />
                      <Input
                        value={findings.diabetesDetails}
                        onChange={(event) => onChange({ diabetesDetails: event.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </FindingsSection>

            <FindingsSection title="Allergy">
              <div className="space-y-4">
                <AllergyDetailRow
                  label="Food Item"
                  details={findings.foodAllergyDetails}
                  value={findings.foodAllergy}
                  onDetailsChange={(value) => onChange({ foodAllergyDetails: value })}
                  onValueChange={(value) => onChange({ foodAllergy: value })}
                />
                <AllergyDetailRow
                  label="Medicine"
                  details={findings.medicineAllergyDetails}
                  value={findings.medicineAllergy}
                  onDetailsChange={(value) => onChange({ medicineAllergyDetails: value })}
                  onValueChange={(value) => onChange({ medicineAllergy: value })}
                />
                <div className="grid gap-4 md:grid-cols-3">
                  <AllergyChoice
                    label="Pollen"
                    value={findings.pollenAllergy}
                    onChange={(value) => onChange({ pollenAllergy: value })}
                  />
                  <AllergyChoice
                    label="Dust"
                    value={findings.dustAllergy}
                    onChange={(value) => onChange({ dustAllergy: value })}
                  />
                  <AllergyChoice
                    label="Mites"
                    value={findings.mitesAllergy}
                    onChange={(value) => onChange({ mitesAllergy: value })}
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel>
                    Others <span className="italic">(If any)</span>
                  </FieldLabel>
                  <Textarea
                    className="min-h-20 bg-background"
                    placeholder="Type details..."
                    value={findings.otherAllergyDetails}
                    onChange={(event) => onChange({ otherAllergyDetails: event.target.value })}
                  />
                </div>
              </div>
            </FindingsSection>

            <FindingsSection title="Medical Details">
              <div className="text-sm text-muted-foreground">
                Add medical details in the additional notes field below.
              </div>
            </FindingsSection>
          </div>
        ) : tab === "Gynae & Obs" ? (
          <GynaeObsForm findings={findings} onChange={onChange} />
        ) : (
          <div className="rounded-md border border-dashed p-6">
            <Textarea
              className="min-h-48 bg-background"
              placeholder={`Type ${tab.toLowerCase()} findings...`}
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
            />
          </div>
        )}

        <Textarea
          className="min-h-24 bg-background"
          placeholder="Additional notes, comment, suggestion..."
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
        />

        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={onClear}>
            <RotateCcw className="h-4 w-4" />
            Clear All
          </Button>
        </div>
      </div>
    </RightDrawer>
  );
}

function GynaeObsForm({
  findings,
  onChange
}: {
  findings: FindingsState;
  onChange: (patch: Partial<FindingsState>) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-md border bg-card shadow-sm">
        <FindingsSection title="A. Menstrual History">
          <div className="grid gap-6 md:grid-cols-2">
            <FindingInput
              label="Menarche (years)"
              value={findings.gynaeMenarche}
              onChange={(value) => onChange({ gynaeMenarche: value })}
            />
            <DateTextInput
              label="LMP"
              value={findings.gynaeLmp}
              onChange={(value) => onChange({ gynaeLmp: value })}
            />
            <SplitInputGroup
              label="Mp"
              separator="+/-"
              values={[findings.gynaeMpFirst, findings.gynaeMpSecond]}
              onChange={(index, value) =>
                onChange(index === 0 ? { gynaeMpFirst: value } : { gynaeMpSecond: value })
              }
            />
            <SplitInputGroup
              label="Mc"
              separator="+/-"
              values={[findings.gynaeMcFirst, findings.gynaeMcSecond]}
              onChange={(index, value) =>
                onChange(index === 0 ? { gynaeMcFirst: value } : { gynaeMcSecond: value })
              }
            />
            <SegmentedField
              label="Flow"
              options={["N/A", "Average", "Less", "More"]}
              value={findings.gynaeFlow}
              onChange={(value) => onChange({ gynaeFlow: value })}
            />
            <SegmentedField
              label="Dysmenorrhoea"
              options={["-", "N/A", "+", "++", "+++"]}
              value={findings.gynaeDysmenorrhoea}
              onChange={(value) => onChange({ gynaeDysmenorrhoea: value })}
            />
          </div>
        </FindingsSection>
      </div>

      <div className="overflow-hidden rounded-md border bg-card shadow-sm">
        <FindingsSection title="B. Obstetrics History">
          <div className="grid gap-6 md:grid-cols-2">
            <DurationInputGroup
              label="Married for"
              values={[
                findings.gynaeMarriedYears,
                findings.gynaeMarriedMonths,
                findings.gynaeMarriedDays
              ]}
              onChange={(index, value) => {
                if (index === 0) onChange({ gynaeMarriedYears: value });
                if (index === 1) onChange({ gynaeMarriedMonths: value });
                if (index === 2) onChange({ gynaeMarriedDays: value });
              }}
            />
            <DateTextInput
              label="Marriage Date"
              value={findings.gynaeMarriageDate}
              onChange={(value) => onChange({ gynaeMarriageDate: value })}
            />
            <div className="space-y-1">
              <FindingInput
                label="Para"
                value={findings.gynaePara}
                onChange={(value) => onChange({ gynaePara: value })}
              />
              <p className="text-xs text-muted-foreground">
                Enter a valid value for para like &quot;1+1-1&quot;
              </p>
            </div>
            <FindingInput
              label="Gravida"
              value={findings.gynaeGravida}
              onChange={(value) => onChange({ gynaeGravida: value })}
            />
            <label className="space-y-1 md:col-span-2">
              <FieldLabel>Note for Para</FieldLabel>
              <Textarea
                className="min-h-20 bg-background"
                placeholder="Type here..."
                value={findings.gynaeParaNote}
                onChange={(event) => onChange({ gynaeParaNote: event.target.value })}
              />
            </label>
            <DurationInputGroup
              label="ALC"
              values={[findings.gynaeAlcYears, findings.gynaeAlcMonths, findings.gynaeAlcDays]}
              onChange={(index, value) => {
                if (index === 0) onChange({ gynaeAlcYears: value });
                if (index === 1) onChange({ gynaeAlcMonths: value });
                if (index === 2) onChange({ gynaeAlcDays: value });
              }}
            />
            <DateTextInput
              label="EDD"
              value={findings.gynaeEdd}
              onChange={(value) => onChange({ gynaeEdd: value })}
            />
          </div>
        </FindingsSection>
      </div>

      <div className="overflow-hidden rounded-md border bg-card shadow-sm">
        <FindingsSection title="C. Per Abdominal (Gynae)">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-1">
              <FieldLabel>NAD</FieldLabel>
              <button
                className={cn(
                  "inline-flex h-10 items-center gap-3 rounded-md px-4 text-sm font-semibold",
                  findings.gynaeNad
                    ? "bg-primary text-primary-foreground"
                    : "border bg-background text-muted-foreground hover:bg-muted"
                )}
                type="button"
                onClick={() => onChange({ gynaeNad: findings.gynaeNad ? "" : "NAD" })}
              >
                <span
                  className={cn(
                    "h-4 w-4 rounded-sm border bg-background",
                    findings.gynaeNad ? "border-primary-foreground" : "border-muted-foreground"
                  )}
                />
                NAD
              </button>
            </div>
            <SegmentedField
              label="Tenderness"
              options={["N/A", "Mild", "Moderate", "Severe"]}
              value={findings.gynaeTenderness}
              onChange={(value) => onChange({ gynaeTenderness: value })}
            />
            <label className="space-y-1 md:col-span-2">
              <FieldLabel>Note:</FieldLabel>
              <Textarea
                className="min-h-24 bg-background"
                placeholder="Type here..."
                value={findings.gynaeAbdominalNote}
                onChange={(event) => onChange({ gynaeAbdominalNote: event.target.value })}
              />
            </label>
          </div>
        </FindingsSection>
      </div>
    </div>
  );
}

type MedicationSidebarProps = {
  medicines: RxMedicine[];
  query: string;
  searchPending: boolean;
  searchResults: MedicineSearchResult[];
  showSearchPanel: boolean;
  value: string;
  waitingForDebounce: boolean;
  onAddMedicine: (item: MedicineSearchResult) => void;
  onAddMedicineName: (name: string) => void;
  onChange: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
  onQueryChange: (value: string) => void;
  onStatus: (tone: "success" | "warning", text: string) => void;
};

function MedicationSidebar({
  medicines,
  query,
  searchPending,
  searchResults,
  showSearchPanel,
  value,
  waitingForDebounce,
  onAddMedicine,
  onAddMedicineName,
  onChange,
  onClear,
  onClose,
  onQueryChange,
  onStatus
}: MedicationSidebarProps) {
  const [sortMode, setSortMode] = useState<"alpha" | "frequent">("alpha");
  const [alphabet, setAlphabet] = useState("ALL");
  const [searchType, setSearchType] = useState("Trade");
  const [medicineType, setMedicineType] = useState("DROP");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredFavourites = medicationFavourites
    .filter((item) => alphabet === "ALL" || item.toUpperCase().startsWith(alphabet))
    .filter((item) => (normalizedQuery ? item.toLowerCase().includes(normalizedQuery) : true))
    .sort((a, b) =>
      sortMode === "alpha" ? a.localeCompare(b) : medicationFavourites.indexOf(a) - medicationFavourites.indexOf(b)
    );

  function addCurrentQuery() {
    const text = query.trim();
    if (!text) {
      onStatus("warning", "Type a medicine name first.");
      return;
    }
    onAddMedicineName(text);
  }

  return (
    <RightDrawer title="Medication" onClose={onClose}>
      <div className="space-y-5">
        <div className="flex gap-0">
          <div className="relative flex-1">
            <Input
              autoFocus
              className="h-14 rounded-r-none border-primary/50 text-lg focus-visible:ring-primary"
              placeholder="Search..."
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (searchResults[0]) onAddMedicine(searchResults[0]);
                  else addCurrentQuery();
                }
              }}
            />
            {showSearchPanel && (searchPending || searchResults.length > 0 || waitingForDebounce) ? (
              <div className="absolute z-30 mt-2 w-full rounded-md border bg-card p-1 shadow-soft">
                {searchPending ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching medicines
                  </div>
                ) : null}
                {!searchPending && searchResults.map((item) => (
                  <button
                    key={item.id}
                    className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                    type="button"
                    onClick={() => onAddMedicine(item)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.brandName}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.genericName} {item.strength}
                      </span>
                    </span>
                    <Plus className="h-4 w-4 flex-none" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <select
            className="h-14 w-28 rounded-r-md border border-l-0 bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
            value={searchType}
            onChange={(event) => setSearchType(event.target.value)}
          >
            <option value="Trade">Trade</option>
            <option value="Generic">Generic</option>
            <option value="Strength">Strength</option>
          </select>
        </div>

        <div className="space-y-5">
          <div className="flex justify-end">
            <SortToggle sortMode={sortMode} onChange={setSortMode} />
          </div>

          <TagCloud
            emptyMessage="No favourite medicines found."
            tags={filteredFavourites}
            onTagClick={onAddMedicineName}
          />

          <AlphabetFilter
            filters={medicationAlphabetFilters}
            value={alphabet}
            onChange={setAlphabet}
          />

          <div className="flex flex-wrap gap-2">
            {medicationTypeFilters.map((item) => (
              <button
                key={item}
                className={cn(
                  "h-8 rounded-sm px-4 text-sm font-medium",
                  medicineType === item
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/90 text-primary-foreground hover:bg-primary"
                )}
                type="button"
                onClick={() => setMedicineType(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            className="inline-flex items-center gap-1 text-primary hover:underline"
            type="button"
            onClick={addCurrentQuery}
          >
            <Plus className="h-4 w-4" />
            Add Custom Medicine
          </button>
        </div>

        {medicines.length ? (
          <div className="rounded-md border">
            <div className="border-b bg-muted px-3 py-2 text-sm font-medium">Selected Medicines</div>
            <div className="divide-y">
              {medicines.map((item, index) => (
                <div key={`${item.brandName}-${index}`} className="px-3 py-2 text-sm">
                  <div className="font-medium">{item.brandName}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.dose} - {item.duration} - {item.instruction}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <NoteTemplateArea
          placeholder="Type here..."
          value={value}
          onChange={onChange}
          onClear={onClear}
        />
      </div>
    </RightDrawer>
  );
}

type TagNoteSidebarProps = {
  addCustomLabel?: string;
  alphabetFilters: string[];
  emptyMessage: string;
  favourites: string[];
  title: string;
  value: string;
  onAddTag: (tag: string) => void;
  onChange: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
  onStatus: (tone: "success" | "warning", text: string) => void;
};

function TagNoteSidebar({
  addCustomLabel,
  alphabetFilters,
  emptyMessage,
  favourites,
  title,
  value,
  onAddTag,
  onChange,
  onClear,
  onClose,
  onStatus
}: TagNoteSidebarProps) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<"alpha" | "frequent">("alpha");
  const [alphabet, setAlphabet] = useState(alphabetFilters[0] ?? "ALL");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredTags = favourites
    .filter((tag) => alphabet === "ALL" || tag.toUpperCase().startsWith(alphabet.toUpperCase()))
    .filter((tag) => (normalizedQuery ? tag.toLowerCase().includes(normalizedQuery) : true))
    .sort((a, b) =>
      sortMode === "alpha" ? a.localeCompare(b) : favourites.indexOf(a) - favourites.indexOf(b)
    );

  function addCustom() {
    const text = query.trim();
    if (!text) {
      onStatus("warning", `Type a ${title.toLowerCase()} item first.`);
      return;
    }
    onAddTag(text);
    setQuery("");
  }

  return (
    <RightDrawer title={title} onClose={onClose}>
      <div className="space-y-5">
        <Input
          autoFocus
          className="h-14 border-primary/50 text-lg focus-visible:ring-primary"
          placeholder="Search..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustom();
            }
          }}
        />

        <div className="space-y-5">
          {favourites.length ? (
            <div className="flex justify-end">
              <SortToggle sortMode={sortMode} onChange={setSortMode} />
            </div>
          ) : null}

          <TagCloud emptyMessage={emptyMessage} tags={filteredTags} onTagClick={onAddTag} />

          {alphabetFilters.length > 1 ? (
            <AlphabetFilter filters={alphabetFilters} value={alphabet} onChange={setAlphabet} />
          ) : null}
        </div>

        {addCustomLabel ? (
          <div className="flex justify-end">
            <button
              className="inline-flex items-center gap-1 text-primary hover:underline"
              type="button"
              onClick={addCustom}
            >
              <Plus className="h-4 w-4" />
              {addCustomLabel}
            </button>
          </div>
        ) : null}

        <NoteTemplateArea
          placeholder="Type here..."
          value={value}
          onChange={onChange}
          onClear={onClear}
        />
      </div>
    </RightDrawer>
  );
}

type FollowUpSidebarProps = {
  date: string;
  note: string;
  onClose: () => void;
  onDateChange: (value: string) => void;
  onNoteChange: (value: string) => void;
};

function FollowUpSidebar({
  date,
  note,
  onClose,
  onDateChange,
  onNoteChange
}: FollowUpSidebarProps) {
  const selectedDate = date ? new Date(`${date}T00:00:00`) : new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  const calendarDays = buildCalendarDays(visibleMonth);
  const monthLabel = visibleMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });

  function setDateFromDays(days: number) {
    const next = new Date();
    next.setDate(next.getDate() + days);
    onDateChange(formatInputDate(next));
    setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  }

  function moveMonth(direction: -1 | 1) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }

  return (
    <RightDrawer title="Follow-Up" onClose={onClose}>
      <div className="space-y-4">
        <div className="max-w-32 space-y-1">
          <FieldLabel>Days</FieldLabel>
          <Input
            inputMode="numeric"
            value={daysFromToday(date)}
            onChange={(event) => {
              const value = event.target.value.replace(/\D/g, "");
              if (!value) {
                onDateChange("");
                return;
              }
              setDateFromDays(Number.parseInt(value, 10));
            }}
          />
        </div>

        <div className="overflow-hidden rounded-md border">
          <div className="flex h-16 items-center justify-between bg-muted px-4">
            <button
              aria-label="Previous month"
              className="rounded-md p-2 text-muted-foreground hover:bg-background hover:text-primary"
              type="button"
              onClick={() => moveMonth(-1)}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="text-xl font-medium">{monthLabel}</div>
            <button
              aria-label="Next month"
              className="rounded-md p-2 text-muted-foreground hover:bg-background hover:text-primary"
              type="button"
              onClick={() => moveMonth(1)}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-t text-center text-lg font-semibold">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((item) => (
              <div key={item} className="py-4">
                {item}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 text-center text-xl">
            {calendarDays.map((item) => {
              const inputDate = formatInputDate(item.date);
              const isSelected = inputDate === date;
              const isOutside = item.date.getMonth() !== visibleMonth.getMonth();

              return (
                <button
                  key={inputDate}
                  className={cn(
                    "mx-auto my-3 flex h-12 w-16 items-center justify-center rounded-sm",
                    isSelected
                      ? "bg-muted-foreground text-background"
                      : isOutside
                        ? "text-muted-foreground/25 hover:bg-muted"
                        : "text-foreground hover:bg-muted"
                  )}
                  type="button"
                  onClick={() => onDateChange(inputDate)}
                >
                  {item.date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-0">
          {[
            ["3 days", 3],
            ["5 days", 5],
            ["7 days", 7],
            ["15 days", 15],
            ["1 month", 30],
            ["1.5 months", 45],
            ["2 months", 60],
            ["3 months", 90],
            ["6 months", 180],
            ["1 Year", 365]
          ].map(([label, days]) => (
            <button
              key={label}
              className="border px-4 py-3 text-sm hover:bg-muted"
              type="button"
              onClick={() => setDateFromDays(days as number)}
            >
              {label}
            </button>
          ))}
        </div>

        <Textarea
          className="min-h-28 bg-background"
          placeholder="Follow-up note"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
        />
      </div>
    </RightDrawer>
  );
}

type ReferralSidebarProps = {
  form: ReferralFormState;
  referrals: ReferralEntry[];
  onAddReferral: (direction: "to" | "from") => void;
  onClose: () => void;
  onRemoveReferral: (id: string) => void;
  onUpdateForm: (patch: Partial<ReferralFormState>) => void;
};

function ReferralSidebar({
  form,
  referrals,
  onAddReferral,
  onClose,
  onRemoveReferral,
  onUpdateForm
}: ReferralSidebarProps) {
  const [tab, setTab] = useState<"to" | "from">("to");

  return (
    <RightDrawer title="Referral" onClose={onClose}>
      <div className="space-y-10">
        <div className="border-b">
          <div className="flex min-w-0 overflow-x-auto">
            <TabButton active={tab === "to"} onClick={() => setTab("to")}>
              Refer To
            </TabButton>
            <TabButton active={tab === "from"} onClick={() => setTab("from")}>
              Referred From
            </TabButton>
          </div>
        </div>

        <div className="rounded-md border">
          <div className="border-b bg-muted px-3 py-2 text-center text-sm">Selected Referrals</div>
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_72px] border-b text-center text-sm font-semibold">
            <div className="border-r px-2 py-2">Name</div>
            <div className="border-r px-2 py-2">Phone Number</div>
            <div className="border-r px-2 py-2">Specialty</div>
            <div className="border-r px-2 py-2">Additional Info</div>
            <div className="px-2 py-2">Delete</div>
          </div>
          {referrals.length ? (
            referrals.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_1fr_1fr_1fr_72px] border-b text-sm last:border-b-0"
              >
                <div className="border-r px-2 py-2">{item.name || "-"}</div>
                <div className="border-r px-2 py-2">{item.phone || "-"}</div>
                <div className="border-r px-2 py-2">{item.specialty || "-"}</div>
                <div className="border-r px-2 py-2">{item.additionalInfo || "-"}</div>
                <button
                  aria-label="Delete referral"
                  className="flex items-center justify-center px-2 py-2 text-destructive hover:bg-muted"
                  type="button"
                  onClick={() => onRemoveReferral(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="border-b px-3 py-3 text-center text-sm text-muted-foreground">
              No records found
            </div>
          )}

          <div className="space-y-3 bg-muted/50 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Name"
                value={form.name}
                onChange={(event) => onUpdateForm({ name: event.target.value })}
              />
              <Input
                placeholder="Phone Number"
                value={form.phone}
                onChange={(event) => onUpdateForm({ phone: event.target.value })}
              />
              <Input
                placeholder="Specialty"
                value={form.specialty}
                onChange={(event) => onUpdateForm({ specialty: event.target.value })}
              />
              <Input
                placeholder="Additional Info"
                value={form.additionalInfo}
                onChange={(event) => onUpdateForm({ additionalInfo: event.target.value })}
              />
            </div>
            <Button type="button" onClick={() => onAddReferral(tab)}>
              Add Referral
            </Button>
          </div>
        </div>
      </div>
    </RightDrawer>
  );
}

function RightDrawer({
  title,
  children,
  onClose
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-foreground/20" onClick={onClose}>
      <aside
        className="ml-auto flex h-full w-full flex-col border-l bg-card shadow-soft md:w-[60%]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex h-12 items-center justify-between gap-3 border-b bg-card px-4">
          <h2 className="text-base font-semibold text-primary">{title}</h2>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={onClose}>
              <Check className="h-4 w-4" />
              Done
            </Button>
            <Button
              aria-label={`Close ${title}`}
              size="icon"
              title={`Close ${title}`}
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              <X className="h-5 w-5 text-destructive" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </aside>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "h-12 border-b-2 px-5 text-base font-semibold",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function FindingsSection({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b p-5 last:border-b-0">
      <h3 className="mb-4 border-b pb-3 text-lg font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-sm font-medium text-foreground">{children}</label>;
}

function FindingInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function DateTextInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex">
        <Input
          className="rounded-r-none"
          inputMode="numeric"
          placeholder="dd/mm/yyyy"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          aria-label={`${label} calendar`}
          className="inline-flex h-9 w-11 items-center justify-center rounded-r-md border border-l-0 bg-primary text-primary-foreground"
          title={`${label} calendar`}
          type="button"
        >
          <CalendarDays className="h-4 w-4" />
        </button>
      </div>
    </label>
  );
}

function SplitInputGroup({
  label,
  separator,
  values,
  onChange
}: {
  label: string;
  separator: string;
  values: [string, string];
  onChange: (index: 0 | 1, value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Input value={values[0]} onChange={(event) => onChange(0, event.target.value)} />
        <span className="text-lg font-semibold text-foreground">{separator}</span>
        <Input value={values[1]} onChange={(event) => onChange(1, event.target.value)} />
      </div>
    </label>
  );
}

function DurationInputGroup({
  label,
  values,
  onChange
}: {
  label: string;
  values: [string, string, string];
  onChange: (index: 0 | 1 | 2, value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <div className="grid grid-cols-3 overflow-hidden rounded-md border">
        {(["Y", "M", "D"] as const).map((placeholder, index) => (
          <Input
            key={placeholder}
            className="rounded-none border-0 border-r last:border-r-0"
            placeholder={placeholder}
            value={values[index]}
            onChange={(event) => onChange(index as 0 | 1 | 2, event.target.value)}
          />
        ))}
      </div>
    </label>
  );
}

function SegmentedField({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap overflow-hidden rounded-md border">
        {options.map((option) => (
          <button
            key={option}
            className={cn(
              "min-h-9 border-r px-4 text-sm font-medium last:border-r-0",
              value === option
                ? "bg-muted-foreground text-background"
                : "bg-background text-muted-foreground hover:bg-muted"
            )}
            type="button"
            onClick={() => onChange(value === option ? "" : option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function TriStateControl({
  value,
  onChange
}: {
  value: TriStateValue;
  onChange: (value: TriStateValue) => void;
}) {
  const options: Array<{ label: string; value: TriStateValue; icon?: ReactNode }> = [
    { label: "No", value: "no", icon: <Ban className="h-4 w-4" /> },
    { label: "N/A", value: "na" },
    { label: "Yes", value: "yes", icon: <Check className="h-4 w-4" /> }
  ];

  return (
    <div className="flex shrink-0 overflow-hidden rounded-md border">
      {options.map((option) => (
        <button
          key={option.value}
          aria-label={option.label}
          className={cn(
            "flex h-10 min-w-11 items-center justify-center border-r px-3 text-sm font-semibold last:border-r-0",
            value === option.value
              ? "bg-muted-foreground text-background"
              : "bg-background text-muted-foreground hover:bg-muted"
          )}
          title={option.label}
          type="button"
          onClick={() => onChange(value === option.value ? "" : option.value)}
        >
          {option.icon ?? option.label}
        </button>
      ))}
    </div>
  );
}

function AllergyDetailRow({
  label,
  value,
  details,
  onValueChange,
  onDetailsChange
}: {
  label: string;
  value: TriStateValue;
  details: string;
  onValueChange: (value: TriStateValue) => void;
  onDetailsChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2">
        <TriStateControl value={value} onChange={onValueChange} />
        <Input
          placeholder="Type details..."
          value={details}
          onChange={(event) => onDetailsChange(event.target.value)}
        />
      </div>
    </label>
  );
}

function AllergyChoice({
  label,
  value,
  onChange
}: {
  label: string;
  value: TriStateValue;
  onChange: (value: TriStateValue) => void;
}) {
  return (
    <div className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <TriStateControl value={value} onChange={onChange} />
    </div>
  );
}

function SortToggle({
  sortMode,
  onChange
}: {
  sortMode: "alpha" | "frequent";
  onChange: (value: "alpha" | "frequent") => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border">
      <button
        aria-label="Alphabetical"
        className={cn(
          "flex h-12 w-10 items-center justify-center border-r",
          sortMode === "alpha"
            ? "bg-primary text-primary-foreground"
            : "bg-background text-muted-foreground hover:bg-muted"
        )}
        title="Alphabetical"
        type="button"
        onClick={() => onChange("alpha")}
      >
        <ArrowDownAZ className="h-5 w-5" />
      </button>
      <button
        aria-label="Most Frequent"
        className={cn(
          "flex h-12 w-10 items-center justify-center",
          sortMode === "frequent"
            ? "bg-primary text-primary-foreground"
            : "bg-background text-muted-foreground hover:bg-muted"
        )}
        title="Most Frequent"
        type="button"
        onClick={() => onChange("frequent")}
      >
        <ArrowDown10 className="h-5 w-5" />
      </button>
    </div>
  );
}

function TagCloud({
  emptyMessage,
  tags,
  onTagClick
}: {
  emptyMessage: string;
  tags: string[];
  onTagClick: (tag: string) => void;
}) {
  if (!tags.length) {
    return <div className="text-base text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <button
          key={tag}
          className="rounded bg-muted px-5 py-1.5 text-sm text-foreground hover:bg-primary hover:text-primary-foreground"
          type="button"
          onClick={() => onTagClick(tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}

function AlphabetFilter({
  filters,
  value,
  onChange
}: {
  filters: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {filters.map((item) => (
        <button
          key={item}
          className={cn(
            "h-8 min-w-9 rounded-sm px-3 text-sm font-medium",
            value === item
              ? "bg-accent text-accent-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          type="button"
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function NoteTemplateArea({
  placeholder,
  value,
  onChange,
  onClear
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-2">
      <Textarea
        className="min-h-28 resize-y bg-background"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="flex flex-wrap items-center gap-3 border-b pb-2 text-sm">
        <button
          className="inline-flex items-center gap-1 text-primary hover:underline"
          type="button"
          onClick={onClear}
        >
          <RotateCcw className="h-4 w-4" />
          Clear
        </button>
      </div>
    </div>
  );
}

type PrescriptionOptionTileProps = {
  title: string;
  hasContent: boolean;
  onClear: () => void;
  onOpen: () => void;
};

function PrescriptionOptionTile({
  title,
  hasContent,
  onClear,
  onOpen
}: PrescriptionOptionTileProps) {
  return (
    <section className="relative min-h-[118px] border-b border-border/70 px-5 py-6 last:border-b-0 hover:bg-background/45">
      <button
        aria-label={`Open ${title}`}
        className="absolute inset-0 z-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
        type="button"
        onClick={onOpen}
      />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold uppercase text-muted-foreground">
            {title}
            {hasContent ? (
              <span
                aria-label="Has details"
                className="ml-2 inline-block h-2 w-2 rounded-full bg-primary align-middle"
                title="Has details"
              />
            ) : null}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <PanelIconButton title="Clear All" onClick={onClear}>
            <RotateCcw className="h-4 w-4" />
          </PanelIconButton>
        </div>
      </div>
    </section>
  );
}

function PanelIconButton({
  title,
  children,
  onClick
}: {
  title: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={title}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-primary"
      title={title}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function FloatingPadButton({
  title,
  children,
  onClick
}: {
  title: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={title}
      className="group relative flex h-11 items-center justify-center border-b text-muted-foreground last:border-b-0 hover:bg-muted hover:text-primary"
      title={title}
      type="button"
      onClick={onClick}
    >
      {children}
      <span className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-md border bg-card px-2 py-1 text-xs text-foreground shadow-soft group-hover:block">
        {title}
      </span>
    </button>
  );
}

function PanelDialog({
  title,
  children,
  onClose
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-foreground/20" onClick={onClose}>
      <aside
        className="ml-auto flex h-full w-full flex-col border-l bg-card shadow-soft md:w-[60%]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex h-12 items-center justify-between gap-3 border-b bg-card px-4">
          <h2 className="text-base font-semibold text-primary">{title}</h2>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={onClose}>
              <Check className="h-4 w-4" />
              Done
            </Button>
            <Button
              aria-label="Close dialog"
              size="icon"
              title="Close dialog"
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              <X className="h-5 w-5 text-destructive" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </aside>
    </div>
  );
}

function LabeledField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 rounded-md border bg-background p-2 text-sm md:grid-cols-[110px_minmax(0,1fr)] md:items-center">
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function PatientSummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="truncate font-medium">{value}</div>
    </div>
  );
}

type PatientRegistrationDialogProps = {
  error: string;
  form: PatientFormState;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: (patch: Partial<PatientFormState>) => void;
};

function PatientRegistrationDialog({
  error,
  form,
  isSaving,
  onClose,
  onSubmit,
  onUpdate
}: PatientRegistrationDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/20 p-3 backdrop-blur-sm md:p-6">
      <form
        className="mt-4 w-full max-w-6xl overflow-hidden rounded-md border bg-card shadow-soft"
        onSubmit={onSubmit}
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
          <h2 className="text-sm font-semibold text-primary">Patient Registration</h2>
          <div className="flex items-center gap-3">
            <Button disabled={isSaving} type="submit">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Register This Patient
            </Button>
            <Button
              aria-label="Close patient registration"
              size="icon"
              title="Close patient registration"
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              <X className="h-5 w-5 text-destructive" />
            </Button>
          </div>
        </div>

        <div className="max-h-[calc(100vh-7rem)] space-y-5 overflow-y-auto p-4">
          <label className="flex items-center gap-3 rounded-md border bg-muted px-4 py-3 text-sm md:text-base">
            <input
              checked={form.createPrescription}
              className="h-4 w-4 accent-primary"
              type="checkbox"
              onChange={(event) => onUpdate({ createPrescription: event.target.checked })}
            />
            <span>Create prescription for this patient after registration complete.</span>
          </label>

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <RequiredLabel htmlFor="patient-name">Patient Name</RequiredLabel>
              <Input
                autoFocus
                id="patient-name"
                value={form.name}
                onChange={(event) => onUpdate({ name: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <RequiredLabel htmlFor="patient-mobile">Patient Mobile</RequiredLabel>
              <div className="flex">
                <span className="inline-flex h-9 items-center rounded-l-md border border-r-0 bg-muted px-4 text-sm">
                  +88
                </span>
                <Input
                  className="rounded-l-none"
                  id="patient-mobile"
                  inputMode="tel"
                  placeholder="01X XXXX XXXX"
                  value={form.mobile}
                  onChange={(event) => onUpdate({ mobile: event.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <RequiredLabel>Patient Gender</RequiredLabel>
              <div className="grid grid-cols-3 overflow-hidden rounded-md border">
                {genderOptions.map((option) => (
                  <button
                    key={option.value}
                    className={cn(
                      "h-10 border-r text-sm font-medium last:border-r-0",
                      form.gender === option.value
                        ? "bg-muted-foreground text-background"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    )}
                    type="button"
                    onClick={() => onUpdate({ gender: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="patient-occupation">
                Occupation
              </label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
                id="patient-occupation"
                value={form.occupation}
                onChange={(event) => onUpdate({ occupation: event.target.value })}
              >
                <option value="">Select Occupation</option>
                {occupations.map((occupation) => (
                  <option key={occupation} value={occupation}>
                    {occupation}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <RequiredLabel htmlFor="patient-dob">Date of Birth</RequiredLabel>
              <Input
                id="patient-dob"
                inputMode="numeric"
                placeholder="DD/MM/YYYY"
                value={form.dateOfBirth}
                onChange={(event) => onUpdate({ dateOfBirth: event.target.value })}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-[40px_repeat(3,minmax(0,1fr))] sm:items-end">
              <div className="pb-2 text-center text-sm">or</div>
              <AgeInput
                label="Age"
                placeholder="Y"
                value={form.ageYears}
                onChange={(value) => onUpdate({ ageYears: value })}
              />
              <AgeInput
                label=" "
                placeholder="M"
                value={form.ageMonths}
                onChange={(value) => onUpdate({ ageMonths: value })}
              />
              <AgeInput
                label=" "
                placeholder="D"
                value={form.ageDays}
                onChange={(value) => onUpdate({ ageDays: value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Blood Group</label>
            <div className="grid overflow-hidden rounded-md border sm:grid-cols-4 lg:grid-cols-8">
              {bloodGroups.map((bloodGroup) => (
                <button
                  key={bloodGroup}
                  className={cn(
                    "h-10 border-b border-r text-sm font-medium sm:[&:nth-child(4n)]:border-r-0 lg:border-b-0 lg:[&:nth-child(4n)]:border-r lg:last:border-r-0",
                    form.bloodGroup === bloodGroup
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                  type="button"
                  onClick={() =>
                    onUpdate({ bloodGroup: form.bloodGroup === bloodGroup ? "" : bloodGroup })
                  }
                >
                  {bloodGroup}
                </button>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function RequiredLabel({
  children,
  htmlFor
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label className="text-sm font-medium" htmlFor={htmlFor}>
      <span className="text-destructive">*</span>
      {children}
    </label>
  );
}

function AgeInput({
  label,
  placeholder,
  value,
  onChange
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Input
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
      />
    </div>
  );
}

function trimOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function splitTextLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseOptionalInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parsePatientDate(value: string) {
  if (!value) return undefined;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return undefined;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return date.toISOString();
}

function formatPatientAge(patient: Patient) {
  const parts = [
    patient.ageYears != null ? `${patient.ageYears}Y` : null,
    patient.ageMonths != null ? `${patient.ageMonths}M` : null,
    patient.ageDays != null ? `${patient.ageDays}D` : null
  ].filter(Boolean);

  if (parts.length) return parts.join(" ");
  if (!patient.dateOfBirth) return "Not set";

  const birthDate = new Date(patient.dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return "Not set";

  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  const hadBirthday =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  if (!hadBirthday) years -= 1;
  return `${Math.max(years, 0)}Y`;
}

function findingsHasContent(findings: FindingsState) {
  return Object.values(findings).some((value) => value.trim().length > 0);
}

function buildCalendarDays(month: Date) {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const calendarStart = new Date(firstOfMonth);
  calendarStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    return { date };
  });
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysFromToday(value: string) {
  if (!value) return "";

  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.getTime())) return "";

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((target.getTime() - todayStart.getTime()) / 86_400_000);
  return String(Math.max(diff, 0));
}

function formatTriState(value: TriStateValue) {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  if (value === "na") return "N/A";
  return "";
}

function buildFindingsText(findings: FindingsState, note: string) {
  const lines = [
    findings.bpSystolic || findings.bpDiastolic
      ? `BP: ${findings.bpSystolic || "-"} / ${findings.bpDiastolic || "-"}`
      : "",
    findings.heightFeet || findings.heightInch || findings.heightCm
      ? `Height: ${[findings.heightFeet && `${findings.heightFeet} ft`, findings.heightInch && `${findings.heightInch} in`, findings.heightCm && `${findings.heightCm} cm`].filter(Boolean).join(" / ")}`
      : "",
    findings.ofcCm || findings.ofcInch
      ? `OFC: ${[findings.ofcCm && `${findings.ofcCm} cm`, findings.ofcInch && `${findings.ofcInch} in`].filter(Boolean).join(" / ")}`
      : "",
    findings.pulse ? `Pulse: ${findings.pulse} bpm` : "",
    findings.temperature ? `Temperature: ${findings.temperature} F` : "",
    findings.weight ? `Weight: ${findings.weight} Kg` : "",
    findings.pfr ? `PFR: ${findings.pfr} L/min` : "",
    findings.respiratoryRate ? `Respiratory Rate: ${findings.respiratoryRate}` : "",
    findings.rbs ? `RBS: ${findings.rbs} mmol/l` : "",
    findings.fbs ? `FBS: ${findings.fbs} mmol/l` : "",
    findings.twoHourAbf ? `2-Hrs-ABF: ${findings.twoHourAbf} mmol/l` : "",
    findings.spo2 ? `SpO2: ${findings.spo2}%` : "",
    formatTriState(findings.diabetes)
      ? `Diabetes: ${formatTriState(findings.diabetes)} ${findings.diabetesDetails}`.trim()
      : "",
    formatTriState(findings.foodAllergy)
      ? `Food Allergy: ${formatTriState(findings.foodAllergy)} ${findings.foodAllergyDetails}`.trim()
      : "",
    formatTriState(findings.medicineAllergy)
      ? `Medicine Allergy: ${formatTriState(findings.medicineAllergy)} ${findings.medicineAllergyDetails}`.trim()
      : "",
    formatTriState(findings.pollenAllergy)
      ? `Pollen Allergy: ${formatTriState(findings.pollenAllergy)}`
      : "",
    formatTriState(findings.dustAllergy)
      ? `Dust Allergy: ${formatTriState(findings.dustAllergy)}`
      : "",
    formatTriState(findings.mitesAllergy)
      ? `Mites Allergy: ${formatTriState(findings.mitesAllergy)}`
      : "",
    findings.otherAllergyDetails ? `Other Allergy: ${findings.otherAllergyDetails}` : "",
    findings.gynaeMenarche ? `Menarche: ${findings.gynaeMenarche} years` : "",
    findings.gynaeLmp ? `LMP: ${findings.gynaeLmp}` : "",
    findings.gynaeMpFirst || findings.gynaeMpSecond
      ? `MP: ${[findings.gynaeMpFirst, findings.gynaeMpSecond].filter(Boolean).join(" +/- ")}`
      : "",
    findings.gynaeMcFirst || findings.gynaeMcSecond
      ? `MC: ${[findings.gynaeMcFirst, findings.gynaeMcSecond].filter(Boolean).join(" +/- ")}`
      : "",
    findings.gynaeFlow ? `Flow: ${findings.gynaeFlow}` : "",
    findings.gynaeDysmenorrhoea ? `Dysmenorrhoea: ${findings.gynaeDysmenorrhoea}` : "",
    findings.gynaeMarriedYears || findings.gynaeMarriedMonths || findings.gynaeMarriedDays
      ? `Married for: ${[
          findings.gynaeMarriedYears && `${findings.gynaeMarriedYears}Y`,
          findings.gynaeMarriedMonths && `${findings.gynaeMarriedMonths}M`,
          findings.gynaeMarriedDays && `${findings.gynaeMarriedDays}D`
        ].filter(Boolean).join(" ")}`
      : "",
    findings.gynaeMarriageDate ? `Marriage Date: ${findings.gynaeMarriageDate}` : "",
    findings.gynaePara ? `Para: ${findings.gynaePara}` : "",
    findings.gynaeGravida ? `Gravida: ${findings.gynaeGravida}` : "",
    findings.gynaeParaNote ? `Note for Para: ${findings.gynaeParaNote}` : "",
    findings.gynaeAlcYears || findings.gynaeAlcMonths || findings.gynaeAlcDays
      ? `ALC: ${[
          findings.gynaeAlcYears && `${findings.gynaeAlcYears}Y`,
          findings.gynaeAlcMonths && `${findings.gynaeAlcMonths}M`,
          findings.gynaeAlcDays && `${findings.gynaeAlcDays}D`
        ].filter(Boolean).join(" ")}`
      : "",
    findings.gynaeEdd ? `EDD: ${findings.gynaeEdd}` : "",
    findings.gynaeNad ? `Per Abdominal: ${findings.gynaeNad}` : "",
    findings.gynaeTenderness ? `Tenderness: ${findings.gynaeTenderness}` : "",
    findings.gynaeAbdominalNote ? `Gynae Note: ${findings.gynaeAbdominalNote}` : "",
    note ? `Notes: ${note}` : ""
  ].filter(Boolean);

  return lines.join("\n");
}

function buildPrescriptionText(
  patient: Patient | null,
  notes: Record<NoteKey, string>,
  medicines: RxMedicine[],
  medicationNote: string,
  findings: FindingsState,
  followUpDate: string,
  vision: VisionState,
  referrals: ReferralEntry[]
) {
  const medicineLines = medicines.map(
    (item, index) =>
      `${index + 1}. ${item.brandName} ${item.strength ?? ""} - ${item.dose} - ${item.duration} - ${item.instruction}`
  );
  const findingsText = buildFindingsText(findings, notes.findings);
  const referralLines = referrals.map(
    (item, index) =>
      `${index + 1}. ${item.direction === "to" ? "Refer To" : "Referred From"}: ${[
        item.name,
        item.phone,
        item.specialty,
        item.additionalInfo
      ].filter(Boolean).join(" - ")}`
  );

  return [
    `Patient: ${patient?.name ?? "No patient selected"}`,
    notes.complaint ? `Complaint:\n${notes.complaint}` : "",
    notes.history ? `History:\n${notes.history}` : "",
    findingsText ? `Findings:\n${findingsText}` : "",
    notes.investigation ? `Investigation:\n${notes.investigation}` : "",
    notes.diagnosis ? `Diagnosis:\n${notes.diagnosis}` : "",
    medicineLines.length || medicationNote
      ? `Medication:\n${[medicineLines.join("\n"), medicationNote].filter(Boolean).join("\n")}`
      : "",
    vision.note ? `Vision/IOP/Glass:\n${vision.note}` : "",
    notes.advice ? `Advice:\n${notes.advice}` : "",
    followUpDate || notes.followUp
      ? `Follow-Up:\n${[followUpDate, notes.followUp].filter(Boolean).join("\n")}`
      : "",
    referralLines.length || notes.referral
      ? `Referral:\n${[referralLines.join("\n"), notes.referral].filter(Boolean).join("\n")}`
      : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}
