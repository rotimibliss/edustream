import express from 'express';
import { supabase } from '../server.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

const toFrontend = (row) => ({
  id: row.id,
  studentId: row.student_id,
  classId: row.class_id,
  session: row.session,
  term: row.term,
  affectiveScores: row.affective_scores || {},
  psychomotorScores: row.psychomotor_scores || {},
  teacherComment: row.teacher_comment || '',
  headComment: row.head_comment || '',        // ← new
  isApproved: row.is_approved || false,       // ← new
  approvedBy: row.approved_by || null,        // ← new
  timesOpened: row.times_opened || 0,
  timesPresent: row.times_present || 0,
  timesAbsent: row.times_absent || 0
});

// GET all reports
router.get('/', async (req, res) => {
  try {
    const { studentId, classId, term, session } = req.query;
    let query = supabase.from('student_reports').select('*');
    if (studentId) query = query.eq('student_id', studentId);
    if (classId)   query = query.eq('class_id', classId);
    if (term)      query = query.eq('term', term);
    if (session)   query = query.eq('session', session);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(toFrontend));
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// POST - create or upsert report
router.post('/', async (req, res) => {
  try {
    const {
      studentId, classId, session, term,
      affectiveScores, psychomotorScores,
      teacherComment, headComment,
      timesOpened, timesPresent, timesAbsent
    } = req.body;

    const { data: existing } = await supabase
      .from('student_reports')
      .select('id')
      .eq('student_id', studentId)
      .eq('term', term)
      .eq('session', session)
      .single();

    let data, error;

    if (existing) {
      // Build update — teachers can't overwrite head_comment
      const updatePayload = {
        class_id: classId,
        affective_scores: affectiveScores || {},
        psychomotor_scores: psychomotorScores || {},
        teacher_comment: teacherComment || '',
        times_opened: timesOpened || 0,
        times_present: timesPresent || 0,
        times_absent: timesAbsent || 0,
        updated_at: new Date().toISOString()
      };

      ({ data, error } = await supabase
        .from('student_reports')
        .update(updatePayload)
        .eq('id', existing.id)
        .select()
        .single());
    } else {
      ({ data, error } = await supabase
        .from('student_reports')
        .insert([{
          student_id: studentId,
          class_id: classId,
          session,
          term,
          affective_scores: affectiveScores || {},
          psychomotor_scores: psychomotorScores || {},
          teacher_comment: teacherComment || '',
          head_comment: headComment || '',
          times_opened: timesOpened || 0,
          times_present: timesPresent || 0,
          times_absent: timesAbsent || 0
        }])
        .select()
        .single());
    }

    if (error) throw error;
    res.status(201).json(toFrontend(data));
  } catch (error) {
    console.error('Save report error:', error);
    res.status(500).json({ error: 'Failed to save report' });
  }
});

// PUT - update existing report by id
router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('student_reports')
      .update({
        affective_scores: req.body.affectiveScores || {},
        psychomotor_scores: req.body.psychomotorScores || {},
        teacher_comment: req.body.teacherComment || '',
        times_opened: req.body.timesOpened || 0,
        times_present: req.body.timesPresent || 0,
        times_absent: req.body.timesAbsent || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(toFrontend(data));
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// PUT - head comment (headteacher/principal only)
router.put('/:id/head-comment', authorize('headteacher', 'principal', 'admin'), async (req, res) => {
  try {
    const { headComment } = req.body;
    const { data, error } = await supabase
      .from('student_reports')
      .update({
        head_comment: headComment || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(toFrontend(data));
  } catch (error) {
    console.error('Head comment error:', error);
    res.status(500).json({ error: 'Failed to save head comment' });
  }
});

// PUT - approve/publish report (headteacher/principal only)
router.put('/:id/approve', authorize('headteacher', 'principal', 'admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('student_reports')
      .update({
        is_approved: true,
        approved_by: req.user.name,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(toFrontend(data));
  } catch (error) {
    console.error('Approve report error:', error);
    res.status(500).json({ error: 'Failed to approve report' });
  }
});

// PUT - unapprove report (headteacher/principal only)
router.put('/:id/unapprove', authorize('headteacher', 'principal', 'admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('student_reports')
      .update({
        is_approved: false,
        approved_by: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(toFrontend(data));
  } catch (error) {
    console.error('Unapprove report error:', error);
    res.status(500).json({ error: 'Failed to unapprove report' });
  }
});

// DELETE report
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('student_reports')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Report deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

export default router;