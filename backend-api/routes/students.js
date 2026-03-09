import express from 'express';
import { supabase } from '../server.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Transform DB row to frontend format
const toFrontend = (row) => ({
  id: row.id,
  name: row.name,
  grade: row.grade,
  classId: row.class_id,
  parentId: row.parent_id,
  parentName: row.parent_name || '',
  parentPhone: row.parent_phone || '',
  dob: row.dob || '',
  age: row.age || 0,
  gender: row.gender || '',
  email: row.email || '',
  attendance: row.attendance || 100,
  performance: row.performance || 0,
  status: row.status || 'Active',
  avatar: row.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=6366f1&color=fff`
});

router.get('/', async (req, res) => {
  try {
    const { classId, status, search, session } = req.query;

    let sessionYear = session;
    if (!sessionYear) {
      const { data: activeSession, error: activeError } = await supabase
        .from('academic_sessions')
        .select('year')
        .eq('is_active', true)
        .maybeSingle();
      if (activeError) throw activeError;
      sessionYear = activeSession?.year || null;
    }

    // If sessionYear present, override classId using history table
    if (sessionYear) {
      // Get all students with their class for this session
      const { data: historyData, error: historyError } = await supabase
        .from('student_class_history')
        .select('student_id, class_id')
        .eq('session_year', sessionYear);

      if (historyError) throw historyError;

      if (historyData && historyData.length > 0) {
        // Build a map of studentId → classId for this session
        const classMap = {};
        historyData.forEach(h => { classMap[h.student_id] = h.class_id; });
        const studentIds = Object.keys(classMap);

        let query = supabase.from('students').select('*').in('id', studentIds);
        if (status) query = query.eq('status', status);
        if (search) query = query.ilike('name', `%${search}%`);
        if (classId) query = query.filter('id', 'in', 
          studentIds.filter(id => classMap[id] === classId).map(id => `"${id}"`).join(','));
        query = query.order('name', { ascending: true });

        const { data, error } = await query;
        if (error) throw error;

        // Override each student's classId with their historical class
        const students = data.map(s => toFrontend({ ...s, class_id: classMap[s.id] }));

        // Filter by classId after mapping if provided
        const filtered = classId ? students.filter(s => s.classId === classId) : students;
        return res.json(filtered);
      }
    }

    // Default: no session param, return current classId
    let query = supabase.from('students').select('*');
    if (classId) query = query.eq('class_id', classId);
    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('name', `%${search}%`);
    query = query.order('name', { ascending: true });
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(toFrontend));
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Student not found' });
    res.json(toFrontend(data));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .insert([{
        name: req.body.name,
        grade: req.body.grade || '',
        class_id: req.body.classId || null,
        parent_id: req.body.parentId || null,
        parent_name: req.body.parentName || '',
        parent_phone: req.body.parentPhone || '',
        dob: req.body.dob || null,
        age: Number(req.body.age) || 0,
        gender: req.body.gender || '',
        email: req.body.email || '',
        attendance: Number(req.body.attendance) || 100,
        performance: Number(req.body.performance) || 0,
        status: req.body.status || 'Active',
        avatar: req.body.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.body.name)}&background=6366f1&color=fff`
      }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(toFrontend(data));
  } catch (error) {
    console.error('Add student error:', error);
    res.status(500).json({ error: 'Failed to add student' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .update({
        name: req.body.name,
        grade: req.body.grade || '',
        class_id: req.body.classId || null,
        parent_id: req.body.parentId || null,
        parent_name: req.body.parentName || '',
        parent_phone: req.body.parentPhone || '',
        dob: req.body.dob || null,
        age: Number(req.body.age) || 0,
        gender: req.body.gender || '',
        email: req.body.email || '',
        attendance: Number(req.body.attendance) || 100,
        performance: Number(req.body.performance) || 0,
        status: req.body.status || 'Active',
        avatar: req.body.avatar || ''
      })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(toFrontend(data));
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Student deleted' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

router.get('/broadsheet', async (req, res) => {
  res.json([]);
});

router.get('/performance', async (req, res) => {
  res.json([]);
});

// ── GET student class history ─────────────────────────────────────────────
router.get('/:id/class-history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('student_class_history')
      .select('*')
      .eq('student_id', req.params.id)
      .order('session_year', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch class history' });
  }
});

// ── POST promote students ─────────────────────────────────────────────────
router.post('/promote', authorize('admin', 'principal', 'headteacher'), async (req, res) => {
  try {
    const { studentIds, fromClassId, toClassId, fromSession, toSession, graduate } = req.body;

    if (!studentIds?.length) {
      return res.status(400).json({ error: 'No students selected' });
    }

    const results = { promoted: 0, graduated: 0, errors: [] };

    for (const studentId of studentIds) {
      try {
        // 1. Save current class to history (fromSession)
        await supabase
          .from('student_class_history')
          .upsert({
            student_id: studentId,
            class_id: fromClassId,
            session_year: fromSession
          }, { onConflict: 'student_id,session_year' });

        if (graduate) {
          // 2a. Graduate the student
          await supabase
            .from('students')
            .update({
              status: 'Graduated',
              graduation_year: fromSession,
              graduated_at: new Date().toISOString()
            })
            .eq('id', studentId);
          results.graduated++;
        } else {
          // 2b. Save next class to history (toSession)
          await supabase
            .from('student_class_history')
            .upsert({
              student_id: studentId,
              class_id: toClassId,
              session_year: toSession
            }, { onConflict: 'student_id,session_year' });

          // 3. Update student's current classId
          await supabase
            .from('students')
            .update({ class_id: toClassId })
            .eq('id', studentId);

          results.promoted++;
        }
      } catch (err) {
        results.errors.push({ studentId, error: err.message });
      }
    }

    res.json({
      message: `${results.promoted} promoted, ${results.graduated} graduated`,
      ...results
    });
  } catch (error) {
    console.error('Promote error:', error);
    res.status(500).json({ error: 'Promotion failed' });
  }
});
export default router;
