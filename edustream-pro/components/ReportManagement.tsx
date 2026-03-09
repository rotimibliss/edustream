import React, { useState, useEffect, useRef } from 'react';
import {
  Student, Result, Subject, SchoolClass, AcademicSession,
  AffectiveTrait, PsychomotorTrait, StudentReport, AuthUser, SchoolSettings, Teacher
} from '../types';
import { apiService as dataService } from '../services/apiService';

const DEFAULT_SETTINGS: SchoolSettings = {
  name: 'EduStream School', logo: '', address: '', email: '', phone: '',
  primaryColor: '#4f46e5', enableAI: true,
  permissions: {
    teacher: { canManageStudents: true, canEnterResults: true, canViewAllStudents: true, canEditProfiles: false, canViewBroadsheet: true },
    parent: { canViewResults: true, canViewAttendance: true, canViewRemarks: true }
  }
};

// ─── Role helpers ─────────────────────────────────────────────────────────────
const isHead = (role?: string) => role === 'principal' || role === 'headteacher';
const isAdmin = (role?: string) => role === 'admin';
const canApprove = (role?: string) => isHead(role) || isAdmin(role);
const headLabel = (role?: string) => role === 'principal' ? "Principal's" : role === 'headteacher' ? "Head Teacher's" : "Head's";

const ReportManagement: React.FC = () => {
  const [currentUser] = useState<AuthUser | null>(dataService.getCurrentUser());
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SETTINGS);
  const [session, setSession] = useState<AcademicSession | null>(null);
  const [loading, setLoading] = useState(true);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
  const [affectiveTraits, setAffectiveTraits] = useState<AffectiveTrait[]>([]);
  const [psychomotorTraits, setPsychomotorTraits] = useState<PsychomotorTrait[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Head comment editing state
  const [headCommentDraft, setHeadCommentDraft] = useState('');
  const [isSavingHeadComment, setIsSavingHeadComment] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // WhatsApp notification state
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppSent, setWhatsAppSent] = useState<string[]>([]);

  // Signature upload state
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [showSignatureUpload, setShowSignatureUpload] = useState(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // Load all data
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [
          allClasses, allStudents, allSubjects, allResults,
          allReports, affective, psychomotor, allTeachersData,
          settingsData, sessionData
        ] = await Promise.all([
          dataService.getClasses(),
          dataService.getStudents(),
          dataService.getSubjects(),
          dataService.getResults(),
          dataService.getStudentReports(),
          dataService.getAffectiveTraits(),
          dataService.getPsychomotorTraits(),
          dataService.getTeachers(),
          dataService.getSettings(),
          dataService.getActiveSession()
        ]);

        const filteredClasses = currentUser?.role === 'teacher'
          ? allClasses.filter((c: SchoolClass) => c.classTeacherId === currentUser.id)
          : allClasses;

        setClasses(Array.isArray(filteredClasses) ? filteredClasses : []);
        setStudents(Array.isArray(allStudents) ? allStudents : []);
        setSubjects(Array.isArray(allSubjects) ? allSubjects : []);
        setResults(Array.isArray(allResults) ? allResults : []);
        setStudentReports(Array.isArray(allReports) ? allReports : []);
        setAffectiveTraits(Array.isArray(affective) ? affective : []);
        setPsychomotorTraits(Array.isArray(psychomotor) ? psychomotor : []);
        setAllTeachers(Array.isArray(allTeachersData) ? allTeachersData : []);
        setSettings(settingsData || DEFAULT_SETTINGS);
        setSession(sessionData);
      } catch (error) {
        console.error('ReportManagement init error:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [currentUser]);

  // When student changes, pre-fill head comment draft
  useEffect(() => {
    if (reportData) {
      setHeadCommentDraft(reportData.headComment || '');
    } else {
      setHeadCommentDraft('');
    }
  }, [selectedStudentId]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const selectedClass = classes.find(c => c.id === selectedClassId);
  const reportData = studentReports.find(r =>
    r.studentId === selectedStudentId &&
    r.term === session?.term &&
    r.session === session?.year
  );
  const studentResults = results.filter(r =>
    r.studentId === selectedStudentId &&
    r.term === session?.term &&
    r.session === session?.year
  );
  const classTeacher = allTeachers.find(t => t.id === selectedClass?.classTeacherId);

  // Find head/principal teacher for signature
  const headTeacher = allTeachers.find(t => isHead(t.role) || isAdmin(t.role));

  const calculateGrade = (score: number) => {
    if (score >= 70) return 'A';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 45) return 'D';
    if (score >= 40) return 'E';
    return 'F';
  };

  const studentSubjects = subjects.filter(s =>
    !s.isElective || (s.studentIds?.includes(selectedStudentId!))
  );

  const totalPossible = studentSubjects.length * 100;
  const totalObtained = studentResults.reduce((acc, r) => acc + (r.total || 0), 0);
  const percentage = totalPossible > 0 ? ((totalObtained / totalPossible) * 100).toFixed(1) : '0.0';

  // Calculate class average for a subject
  const getSubjectClassAverage = (subjectId: string) => {
    const subjectResults = results.filter(r =>
      r.subjectId === subjectId &&
      r.classId === selectedClassId &&
      r.term === session?.term &&
      r.session === session?.year
    );
    if (subjectResults.length === 0) return 0;
    const total = subjectResults.reduce((acc, r) => acc + (r.total || 0), 0);
    return (total / subjectResults.length).toFixed(1);
  };

  // ── Save head comment ──────────────────────────────────────────────────────
  const handleSaveHeadComment = async () => {
    if (!reportData?.id) {
      alert('No report found for this student. Ensure teacher has saved the evaluation first.');
      return;
    }
    setIsSavingHeadComment(true);
    try {
      await (dataService as any).saveHeadComment(reportData.id, headCommentDraft);
      // Update local state
      setStudentReports(prev => prev.map(r =>
        r.id === reportData.id ? { ...r, headComment: headCommentDraft } : r
      ));
      alert('Comment saved successfully!');
    } catch (err) {
      alert('Failed to save comment.');
    } finally {
      setIsSavingHeadComment(false);
    }
  };

  // ── Approve / unapprove ────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!reportData?.id) {
      alert('No report to approve. Teacher must save evaluation first.');
      return;
    }
    setIsApproving(true);
    try {
      if (reportData.isApproved) {
        await (dataService as any).unapproveReport(reportData.id);
        setStudentReports(prev => prev.map(r =>
          r.id === reportData.id ? { ...r, isApproved: false, approvedBy: undefined } : r
        ));
      } else {
        await (dataService as any).approveReport(reportData.id);
        setStudentReports(prev => prev.map(r =>
          r.id === reportData.id ? { ...r, isApproved: true, approvedBy: currentUser?.name } : r
        ));
      }
    } catch (err) {
      alert('Failed to update approval.');
    } finally {
      setIsApproving(false);
    }
  };

  // ── WhatsApp notification ──────────────────────────────────────────────────
  const buildWhatsAppLink = (parentPhone: string) => {
    const studentName = selectedStudent?.name || 'the student';
    const className = `${selectedClass?.name || ''} ${selectedClass?.arm || ''}`.trim();
    const term = session?.term || '';
    const sessionYear = session?.year || '';
    const schoolName = settings.name || 'Our School';
    const portalLink = window.location.origin;
    const message =
      `Hello Parent/Guardian,\n\n` +
      `This is to inform you that the academic result for *${studentName}* ` +
      `for *${term} (${sessionYear})* — *${className}* — has been approved and is now available.\n\n` +
      `🏫 *School:* ${schoolName}\n` +
      `👤 *Student:* ${studentName}\n` +
      `📚 *Class & Term:* ${className} • ${term}\n` +
      `🔗 *View Result:* ${portalLink}\n\n` +
      `Please log in to the parent portal to view the full report card.\n\n` +
      `Regards,\n${currentUser?.name || 'The Principal'}\n${schoolName}`;
    const cleanPhone = parentPhone.replace(/[\s\-()+]/g, '').replace(/^0/, '234');
    return `https://api.whatsapp.com/send/?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
  };

  const handleSendWhatsApp = () => {
    const parentPhone =
      (selectedStudent as any)?.parentPhone ||
      (selectedStudent as any)?.guardianPhone ||
      (selectedStudent as any)?.parent_phone ||
      (selectedStudent as any)?.phone || '';
    if (!parentPhone) {
      alert(`No parent phone number found for ${selectedStudent?.name}. Please add a phone number to this student's profile first.`);
      return;
    }
    window.open(buildWhatsAppLink(parentPhone), '_blank');
    setWhatsAppSent(prev => [...prev, selectedStudentId!]);
    setShowWhatsAppModal(false);
  };

  // ── Signature upload ───────────────────────────────────────────────────────
  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64 for preview and storage
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setSignaturePreview(base64);
      setIsUploadingSignature(true);
      try {
        await (dataService as any).updateSignature(currentUser!.id, base64);
        // Update local teachers list
        setAllTeachers(prev => prev.map(t =>
          t.id === currentUser!.id ? { ...t, signature: base64 } : t
        ));
        alert('Signature saved successfully! It will appear on all report cards.');
        setShowSignatureUpload(false);
      } catch (err) {
        alert('Failed to save signature.');
      } finally {
        setIsUploadingSignature(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Current user's signature ───────────────────────────────────────────────
  const currentUserTeacher = allTeachers.find(t => t.id === currentUser?.id);
  const mySignature = signaturePreview || currentUserTeacher?.signature || null;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Loading Report Cards...</p>
        </div>
      </div>
    );
  }

  // ─── CLASS + STUDENT SELECTION VIEW ──────────────────────────────────────────
  if (!selectedStudentId) {
    return (
      <div className="p-8 max-w-6xl mx-auto animate-fadeIn">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-800 tracking-tighter">Report Card Roster</h1>
            <p className="text-gray-500 mt-2 font-medium uppercase tracking-widest text-[10px]">
              {session ? `${session.term} • ${session.year}` : ''} — Select a class then a student.
            </p>
          </div>

          {/* Signature upload button — only for teachers/heads, not admin/parent */}
          {currentUser && (currentUser.role === 'teacher' || canApprove(currentUser.role)) && (
            <button
              onClick={() => setShowSignatureUpload(true)}
              className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-dashed border-indigo-300 rounded-2xl text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-2.828 1.172H7v-2a4 4 0 011.172-2.828z" />
              </svg>
              {mySignature ? 'Update My Signature' : 'Upload My Signature'}
              {mySignature && <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1"></span>}
            </button>
          )}
        </header>

        {/* Signature upload modal */}
        {showSignatureUpload && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] p-10 w-full max-w-md shadow-2xl animate-fadeIn">
              <h2 className="text-2xl font-black text-gray-800 mb-2">Upload Signature</h2>
              <p className="text-sm text-gray-400 mb-6">Upload once — it will appear on all report cards you sign. Use a clear image on white background.</p>

              {/* Preview */}
              {mySignature && (
                <div className="mb-6 p-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center bg-gray-50 min-h-[80px]">
                  <img src={mySignature} alt="Signature preview" className="max-h-20 object-contain" />
                </div>
              )}

              <input
                ref={signatureInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleSignatureUpload}
              />

              <button
                onClick={() => signatureInputRef.current?.click()}
                disabled={isUploadingSignature}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs mb-3 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isUploadingSignature
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving...</>
                  : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" /></svg> Choose Image</>
                }
              </button>
              <button
                onClick={() => setShowSignatureUpload(false)}
                className="w-full py-3 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Class List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">Classes</h3>
            {classes.length === 0 ? (
              <div className="p-8 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-center text-gray-400 font-bold text-sm italic">
                No classes available.
              </div>
            ) : (
              classes.map(cls => (
                <button
                  key={cls.id}
                  onClick={() => { setSelectedClassId(cls.id); setSelectedStudentId(null); }}
                  className={`w-full p-6 rounded-[28px] text-left transition-all border-2 ${
                    selectedClassId === cls.id
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100'
                      : 'bg-white border-transparent hover:border-indigo-200 shadow-sm'
                  }`}
                >
                  <p className="text-lg font-black">{cls.name}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${selectedClassId === cls.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                    Arm {cls.arm} • {students.filter(s => s.classId === cls.id).length} Students
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Student Grid */}
          <div className="lg:col-span-2">
            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">
              {selectedClassId ? `Students in ${selectedClass?.name} ${selectedClass?.arm}` : 'Select a class'}
            </h3>
            {!selectedClassId ? (
              <div className="py-20 text-center opacity-30 flex flex-col items-center">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <p className="text-sm font-black uppercase tracking-[0.2em]">Select a class first</p>
              </div>
            ) : students.filter(s => s.classId === selectedClassId).length === 0 ? (
              <div className="py-20 text-center opacity-30">
                <p className="font-black uppercase tracking-widest text-sm">No students in this class</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {students.filter(s => s.classId === selectedClassId).map(student => {
                  const hasReport = studentReports.some(r =>
                    r.studentId === student.id &&
                    r.term === session?.term &&
                    r.session === session?.year
                  );
                  const hasResults = results.some(r =>
                    r.studentId === student.id &&
                    r.term === session?.term &&
                    r.session === session?.year
                  );
                  const isApproved = studentReports.find(r =>
                    r.studentId === student.id &&
                    r.term === session?.term &&
                    r.session === session?.year
                  )?.isApproved;

                  return (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudentId(student.id)}
                      className="bg-white p-6 rounded-[28px] border border-gray-100 hover:shadow-xl hover:border-indigo-300 transition-all flex items-center space-x-4 group shadow-sm text-left"
                    >
                      <img
                        src={student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=6366f1&color=fff`}
                        className="w-12 h-12 rounded-2xl border border-gray-100 object-cover shadow-sm"
                        alt={student.name}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-800 text-sm group-hover:text-indigo-600 transition-colors truncate">{student.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{student.id}</p>
                        <div className="flex items-center flex-wrap gap-1 mt-1">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg ${hasResults ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                            {hasResults ? 'Results ✓' : 'No Results'}
                          </span>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg ${hasReport ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                            {hasReport ? 'Report ✓' : 'No Report'}
                          </span>
                          {isApproved && (
                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-emerald-600 text-white">
                              Approved ✓
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── REPORT CARD VIEW ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100/50 p-8 flex flex-col items-center animate-fadeIn print:bg-white print:p-0">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-card-canvas, #report-card-canvas * { visibility: visible; }
          #report-card-canvas { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }
          .print-hidden { display: none !important; }
        }
      `}</style>

      {/* Control Bar */}
      <div className="w-full max-w-[900px] mb-6 flex items-center justify-between print-hidden flex-wrap gap-4">
        <button
          onClick={() => setSelectedStudentId(null)}
          className="flex items-center text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-indigo-600 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Selection
        </button>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Approve button — heads and admin only */}
          {canApprove(currentUser?.role) && reportData && (
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all disabled:opacity-50 ${
                reportData.isApproved
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-emerald-600 text-white shadow-xl shadow-emerald-100 hover:bg-emerald-700'
              }`}
            >
              {isApproving
                ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"></div>
                : reportData.isApproved
                  ? <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg> Unapprove</>
                  : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg> Approve & Publish</>
              }
            </button>
          )}

          {/* WhatsApp Notify Parent — visible to anyone who can approve, once report is approved */}
          {canApprove(currentUser?.role) && reportData?.isApproved && (
            <button
              onClick={() => setShowWhatsAppModal(true)}
              className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all ${
                whatsAppSent.includes(selectedStudentId!)
                  ? 'bg-green-100 text-green-700 border-2 border-green-300'
                  : 'bg-[#25D366] text-white shadow-xl shadow-green-100 hover:bg-green-600'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {whatsAppSent.includes(selectedStudentId!) ? '✓ Parent Notified' : 'Notify Parent'}
            </button>
          )}

          {/* Nav arrows */}
          {(() => {
            const classStudents = students.filter(s => s.classId === selectedClassId);
            const idx = classStudents.findIndex(s => s.id === selectedStudentId);
            return (
              <>
                <button disabled={idx <= 0} onClick={() => setSelectedStudentId(classStudents[idx - 1]?.id)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-500 disabled:opacity-30 hover:border-indigo-300 transition-all">← Prev</button>
                <span className="text-[10px] font-black text-gray-400 uppercase">{idx + 1} / {classStudents.length}</span>
                <button disabled={idx >= classStudents.length - 1} onClick={() => setSelectedStudentId(classStudents[idx + 1]?.id)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-500 disabled:opacity-30 hover:border-indigo-300 transition-all">Next →</button>
              </>
            );
          })()}

          <button onClick={() => window.print()}
            className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center space-x-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* WhatsApp Notification Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-[#25D366] rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-green-200">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-800">Notify Parent</h2>
                <p className="text-sm text-gray-400 font-medium">Send WhatsApp message to parent</p>
              </div>
            </div>

            <div className="bg-[#ECF8F1] rounded-2xl p-4 mb-5 border border-green-100">
              <p className="text-[9px] font-black text-green-700 uppercase tracking-widest mb-2">Message Preview</p>
              <p className="text-xs text-gray-700 leading-relaxed">
                Hello Parent/Guardian,<br/><br/>
                The result for <strong>{selectedStudent?.name}</strong> for{' '}
                <strong>{session?.term} ({session?.year})</strong> —{' '}
                <strong>{selectedClass?.name} {selectedClass?.arm}</strong> has been approved and is now available.<br/><br/>
                🏫 <strong>{settings.name}</strong> &nbsp;|&nbsp; 🔗 Portal link included
              </p>
            </div>

            <div className={`rounded-2xl px-4 py-3 mb-6 flex items-center gap-3 ${
              ((selectedStudent as any)?.parentPhone || (selectedStudent as any)?.guardianPhone || (selectedStudent as any)?.parent_phone || (selectedStudent as any)?.phone)
                ? 'bg-gray-50' : 'bg-rose-50 border border-rose-200'
            }`}>
              <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
              </svg>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Sending to</p>
                <p className="text-sm font-black text-gray-800">
                  {(selectedStudent as any)?.parentPhone
                    || (selectedStudent as any)?.guardianPhone
                    || (selectedStudent as any)?.parent_phone
                    || (selectedStudent as any)?.phone
                    || <span className="text-rose-500 font-bold text-xs">⚠ No phone number on this student's profile</span>}
                </p>
              </div>
            </div>

            <button
              onClick={handleSendWhatsApp}
              disabled={!((selectedStudent as any)?.parentPhone || (selectedStudent as any)?.guardianPhone || (selectedStudent as any)?.parent_phone || (selectedStudent as any)?.phone)}
              className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-black uppercase tracking-widest text-xs mb-3 hover:bg-green-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Open WhatsApp & Send
            </button>
            <button
              onClick={() => setShowWhatsAppModal(false)}
              className="w-full py-3 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Approval status banner */}
      {reportData?.isApproved && (
        <div className="w-full max-w-[900px] mb-4 print-hidden">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-black text-emerald-700">
              Approved & Published by <span className="text-emerald-900">{reportData.approvedBy}</span>
            </p>
          </div>
        </div>
      )}

      {/* Head comment panel — only visible to heads/admin, not on print */}
      {canApprove(currentUser?.role) && (
        <div className="w-full max-w-[900px] mb-4 print-hidden">
          <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{headLabel(currentUser?.role)} Comment</p>
                <p className="text-xs text-gray-400 mt-0.5">This will appear on the printed report card</p>
              </div>
              <button
                onClick={handleSaveHeadComment}
                disabled={isSavingHeadComment}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSavingHeadComment
                  ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  : null}
                Save Comment
              </button>
            </div>
            <textarea
              rows={3}
              value={headCommentDraft}
              onChange={e => setHeadCommentDraft(e.target.value)}
              placeholder="Enter your remark for this student's report card..."
              className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:border-indigo-400 outline-none resize-none transition-all"
            />
          </div>
        </div>
      )}

      {/* Report Card Canvas */}
      <div id="report-card-canvas" className="w-full max-w-[900px] bg-white border border-gray-200 shadow-2xl p-12 min-h-[1100px] flex flex-col font-serif text-gray-800">

        {/* School Header */}
        <div className="flex items-center justify-between border-b-4 border-gray-800 pb-8 mb-8">
          <div className="flex items-center space-x-6">
            {settings.logo ? (
              <img src={settings.logo} className="w-24 h-24 object-contain" alt="School Logo" />
            ) : (
              <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">{settings.name}</h1>
              <p className="text-xs font-bold leading-relaxed text-gray-600">{settings.address}</p>
              {(settings.email || settings.phone) && (
                <p className="text-[10px] font-medium italic text-gray-500">
                  {settings.email && `Email: ${settings.email}`}{settings.email && settings.phone && ' | '}{settings.phone && `Tel: ${settings.phone}`}
                </p>
              )}
            </div>
          </div>
          {/* Approval stamp on printed card */}
          {reportData?.isApproved && (
            <div className="border-2 border-emerald-600 rounded-xl px-4 py-2 text-center">
              <p className="text-[8px] font-black uppercase text-emerald-600 tracking-widest">Approved</p>
              <p className="text-[7px] text-emerald-500 font-bold">{reportData.approvedBy}</p>
            </div>
          )}
        </div>

        {/* Report Title */}
        <div className="text-center mb-8">
          <h2 className="text-lg font-black uppercase border-y-2 border-gray-300 py-2 tracking-widest bg-gray-50/50">
            {session?.term} STUDENT PERFORMANCE REPORT — {session?.year}
          </h2>
        </div>

        {/* Bio Data */}
        <div className="flex gap-8 mb-8">
          <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-3 text-[11px] font-bold">
            {[
              ['Student Name', selectedStudent?.name?.toUpperCase()],
              ['Admission No', selectedStudent?.id],
              ['Class', `${selectedClass?.name} - ${selectedClass?.arm}`],
              ['Session', session?.year],
              ['Gender', selectedStudent?.gender || 'N/A'],
              ['Age', `${selectedStudent?.age || '-'} Years`],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col border-b border-gray-200 py-1">
                <span className="text-[8px] text-gray-400 uppercase tracking-widest mb-0.5">{label}</span>
                <span className="text-gray-900">{value || '—'}</span>
              </div>
            ))}
          </div>
          <div className="w-28 h-32 border-2 border-gray-200 rounded-lg overflow-hidden shrink-0">
            <img
              src={selectedStudent?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudent?.name || 'S')}&background=6366f1&color=fff`}
              className="w-full h-full object-cover grayscale"
              alt={selectedStudent?.name}
            />
          </div>
        </div>

        {/* Main Content: Results + Side Tables */}
        <div className="flex gap-6 mb-8 items-start">

          {/* Academic Results Table */}
          <div className="flex-1">
            <table className="w-full border-2 border-gray-800 text-[10px] leading-tight">
              <thead className="bg-gray-200">
                <tr className="border-b-2 border-gray-800">
                  <th className="px-3 py-2 border-r-2 border-gray-800 text-left uppercase">Subjects</th>
                  <th className="w-8 px-1 py-2 border-r-2 border-gray-800 text-center uppercase">CA1<br/>20</th>
                  <th className="w-8 px-1 py-2 border-r-2 border-gray-800 text-center uppercase">CA2<br/>20</th>
                  <th className="w-10 px-1 py-2 border-r-2 border-gray-800 text-center uppercase">Exam<br/>60</th>
                  <th className="w-10 px-1 py-2 border-r-2 border-gray-800 text-center uppercase text-[9px]">Class<br/>Avg</th>
                  <th className="w-12 px-1 py-2 border-r-2 border-gray-800 text-center uppercase bg-gray-300">Total<br/>100</th>
                  <th className="w-10 px-1 py-2 border-r-2 border-gray-800 text-center uppercase">Grade</th>
                  <th className="px-2 py-2 text-center uppercase">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {studentSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-gray-400 italic">No subjects assigned to this class</td>
                  </tr>
                ) : (
                  studentSubjects.map(sub => {
                    const res = studentResults.find(r => r.subjectId === sub.id);
                    const classAvg = getSubjectClassAverage(sub.id);
                    return (
                      <tr key={sub.id} className="border-b border-gray-300">
                        <td className="px-3 py-1.5 border-r border-gray-800 uppercase font-bold">{sub.name}</td>
                        <td className="px-1 py-1.5 border-r border-gray-800 text-center">{res?.ca1 ?? '-'}</td>
                        <td className="px-1 py-1.5 border-r border-gray-800 text-center">{res?.ca2 ?? '-'}</td>
                        <td className="px-1 py-1.5 border-r border-gray-800 text-center">{res?.exam ?? '-'}</td>
                        <td className="px-1 py-1.5 border-r border-gray-800 text-center font-bold text-indigo-600">{classAvg}</td>
                        <td className="px-1 py-1.5 border-r border-gray-800 text-center font-black bg-gray-50">{res?.total ?? '-'}</td>
                        <td className="px-1 py-1.5 border-r border-gray-800 text-center font-bold">{res ? calculateGrade(res.total) : '-'}</td>
                        <td className="px-2 py-1.5 text-center uppercase text-[8px] font-bold">{res?.remark || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Summary Box */}
            <div className="mt-3 grid grid-cols-2 border-2 border-gray-800 p-4 bg-gray-50/50">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase">Performance Summary</p>
                <p className="text-xs font-bold text-gray-500">Total Obtained: <span className="text-gray-900 font-black">{totalObtained}</span></p>
                <p className="text-xs font-bold text-gray-500">Total Obtainable: <span className="text-gray-900 font-black">{totalPossible}</span></p>
              </div>
              <div className="flex flex-col items-end justify-center">
                <p className="text-3xl font-black text-gray-800">{percentage}%</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Terminal Average</p>
              </div>
            </div>
          </div>

          {/* Sidebar: Attendance + Traits */}
          <div className="w-60 space-y-4 shrink-0">
            {/* Attendance */}
            <div>
              <p className="text-[9px] font-black uppercase bg-gray-800 text-white px-2 py-1 mb-0">Attendance</p>
              <table className="w-full border border-gray-800 text-[10px]">
                <tbody>
                  {[
                    ['Days Opened', reportData?.timesOpened ?? 0],
                    ['Days Present', reportData?.timesPresent ?? 0],
                    ['Days Absent', reportData?.timesAbsent ?? 0],
                  ].map(([label, val]) => (
                    <tr key={String(label)} className="border-b border-gray-300">
                      <td className="px-2 py-1 bg-gray-50 font-bold uppercase">{label}</td>
                      <td className={`px-2 py-1 text-center font-black ${label === 'Days Absent' && Number(val) > 0 ? 'text-rose-600' : ''}`}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Affective Traits */}
            {affectiveTraits.length > 0 && (
              <div>
                <p className="text-[9px] font-black uppercase bg-gray-800 text-white px-2 py-1 mb-0">Affective Domain</p>
                <table className="w-full border border-gray-800 text-[9px]">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-200">
                      <th className="px-2 py-1 text-left uppercase">Trait</th>
                      {[5,4,3,2,1].map(n => <th key={n} className="w-5 text-center border-l border-gray-800">{n}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {affectiveTraits.map(t => (
                      <tr key={t.id} className="border-b border-gray-200">
                        <td className="px-2 py-0.5 uppercase truncate max-w-[80px]">{t.name}</td>
                        {[5,4,3,2,1].map(score => (
                          <td key={score} className="border-l border-gray-300 text-center font-black text-emerald-700">
                            {reportData?.affectiveScores?.[t.id] === score ? '✓' : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Psychomotor Traits */}
            {psychomotorTraits.length > 0 && (
              <div>
                <p className="text-[9px] font-black uppercase bg-gray-800 text-white px-2 py-1 mb-0">Psychomotor Domain</p>
                <table className="w-full border border-gray-800 text-[9px]">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-200">
                      <th className="px-2 py-1 text-left uppercase">Skill</th>
                      {[5,4,3,2,1].map(n => <th key={n} className="w-5 text-center border-l border-gray-800">{n}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {psychomotorTraits.map(t => (
                      <tr key={t.id} className="border-b border-gray-200">
                        <td className="px-2 py-0.5 uppercase truncate max-w-[80px]">{t.name}</td>
                        {[5,4,3,2,1].map(score => (
                          <td key={score} className="border-l border-gray-300 text-center font-black text-emerald-700">
                            {reportData?.psychomotorScores?.[t.id] === score ? '✓' : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Remarks & Signatures ── */}
        <div className="mt-auto pt-6 border-t-2 border-gray-200 space-y-5">

          {/* Class Teacher's Remark */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Class Teacher's Remark:</span>
            <div className="p-3 bg-gray-50/50 border border-dashed border-gray-300 text-xs italic font-medium mt-1 min-h-[48px] flex items-center">
              {reportData?.teacherComment || 'No comment entered yet.'}
            </div>
            <div className="flex justify-between items-end mt-2 px-2">
              <div className="text-center">
                {/* Teacher signature */}
                {classTeacher?.signature ? (
                  <div className="mb-0.5">
                    <img src={classTeacher.signature} alt="Teacher signature" className="h-10 object-contain" />
                  </div>
                ) : (
                  <div className="border-b border-gray-800 w-44 mb-0.5"></div>
                )}
                <span className="text-[8px] uppercase font-black text-gray-400">{classTeacher?.name || '________________________'}</span>
              </div>
              <div className="text-center">
                <div className="border-b border-gray-800 w-32 mb-0.5"></div>
                <span className="text-[8px] uppercase font-black text-gray-400">Date</span>
              </div>
            </div>
          </div>

          {/* Head / Principal's Remark */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              {headTeacher ? headLabel(headTeacher.role as string) : "Principal's"} Remark:
            </span>
            <div className="p-3 bg-gray-50/50 border border-dashed border-gray-300 text-xs italic font-medium mt-1 min-h-[48px] flex items-center">
              {reportData?.headComment || 'No comment entered yet.'}
            </div>
            <div className="flex justify-between items-end mt-2 px-2">
              <div className="text-center">
                {/* Head signature */}
                {headTeacher?.signature ? (
                  <div className="mb-0.5">
                    <img src={headTeacher.signature} alt="Head signature" className="h-10 object-contain" />
                  </div>
                ) : (
                  <div className="border-b border-gray-800 w-44 mb-0.5"></div>
                )}
                <span className="text-[8px] uppercase font-black text-gray-400">
                  {headTeacher?.name || 'Principal / Head Teacher'}
                </span>
              </div>
              <div className="text-center">
                <div className="border-b border-gray-800 w-32 mb-0.5"></div>
                <span className="text-[8px] uppercase font-black text-gray-400">Date</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-6 mt-4 border-t border-gray-100 opacity-40 text-[8px] font-black uppercase tracking-[0.3em]">
          <span>Generated: {new Date().toLocaleDateString()}</span>
          <span>Official Transcript • {settings.name}</span>
        </div>
      </div>
    </div>
  );
};

export default ReportManagement;
