import express from 'express';
import { supabase } from '../server.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

const toFrontend = (row) => ({
  id: row.id,
  studentId: row.student_id,
  subjectId: row.subject_id,
  classId: row.class_id,
  session: row.session,
  term: row.term,
  ca1: row.ca1 || 0,
  ca2: row.ca2 || 0,
  exam: row.exam || 0,
  total: row.total || 0,
  remark: row.remark || ''
});

router.get('/', async (req, res) => {
  try {
    const { classId, studentId, term, session } = req.query;
    let query = supabase.from('results').select('*');
    if (classId) query = query.eq('class_id', classId);
    if (studentId) query = query.eq('student_id', studentId);
    if (term) query = query.eq('term', term);
    if (session) query = query.eq('session', session);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(toFrontend));
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

router.post('/', async (req, res) => {
  try {
    const ca1 = Number(req.body.ca1) || 0;
    const ca2 = Number(req.body.ca2) || 0;
    const exam = Number(req.body.exam) || 0;
    const total = ca1 + ca2 + exam;
    const remark = total >= 70 ? 'Excellent' : total >= 60 ? 'Very Good' :
      total >= 50 ? 'Good' : total >= 45 ? 'Pass' : 'Fail';

    const { data, error } = await supabase
      .from('results')
      .insert([{
        student_id: req.body.studentId,
        subject_id: req.body.subjectId,
        class_id: req.body.classId,
        session: req.body.session,
        term: req.body.term,
        ca1, ca2, exam, total, remark
      }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(toFrontend(data));
  } catch (error) {
    console.error('Add result error:', error);
    res.status(500).json({ error: 'Failed to add result' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const ca1 = Number(req.body.ca1) || 0;
    const ca2 = Number(req.body.ca2) || 0;
    const exam = Number(req.body.exam) || 0;
    const total = ca1 + ca2 + exam;
    const remark = total >= 70 ? 'Excellent' : total >= 60 ? 'Very Good' :
      total >= 50 ? 'Good' : total >= 45 ? 'Pass' : 'Fail';

    const { data, error } = await supabase
      .from('results')
      .update({
        student_id: req.body.studentId,
        subject_id: req.body.subjectId,
        class_id: req.body.classId,
        session: req.body.session,
        term: req.body.term,
        ca1, ca2, exam, total, remark
      })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(toFrontend(data));
  } catch (error) {
    console.error('Update result error:', error);
    res.status(500).json({ error: 'Failed to update result' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('results')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Result deleted' });
  } catch (error) {
    console.error('Delete result error:', error);
    res.status(500).json({ error: 'Failed to delete result' });
  }
});

export default router;