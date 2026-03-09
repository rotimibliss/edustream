import express from 'express';
import { supabase } from '../server.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

const toFrontend = (row) => ({
  id: row.id,
  year: row.year,
  term: row.term,
  isActive: row.is_active || false
});

// GET all sessions
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('academic_sessions')
      .select('*')
      .order('year', { ascending: false })
      .order('term');
    if (error) throw error;
    res.json(data.map(toFrontend));
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// POST - create new session
router.post('/', authorize('admin'), async (req, res) => {
  try {
    const { year, term } = req.body;

    const normalizedYear = String(year || '').trim();
    const normalizedTerm = String(term || '').trim();

    if (!normalizedYear || !normalizedTerm) {
      return res.status(400).json({ error: 'Year and term are required' });
    }

    const { data: existing } = await supabase
      .from('academic_sessions')
      .select('id')
      .eq('year', normalizedYear)
      .eq('term', normalizedTerm)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        error: `Session "${normalizedYear} - ${normalizedTerm}" already exists`
      });
    }

    const { data, error } = await supabase
      .from('academic_sessions')
      .insert([{ year: normalizedYear, term: normalizedTerm, is_active: false }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(toFrontend(data));
  } catch (error) {
    console.error('Add session error:', error);
    res.status(500).json({ error: 'Failed to add session' });
  }
});

// PUT - activate session
router.put('/:id/activate', authorize('admin'), async (req, res) => {
  try {
    console.log('Activating session:', req.params.id);

    const { data: target, error: findError } = await supabase
      .from('academic_sessions')
      .select('id')
      .eq('id', req.params.id)
      .single();

    console.log('Found target:', target, 'Find error:', findError);

    if (findError || !target) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { error: deactivateError } = await supabase
      .from('academic_sessions')
      .update({ is_active: false })
      .neq('id', req.params.id);

    console.log('Deactivate error:', deactivateError);

    const { data, error } = await supabase
      .from('academic_sessions')
      .update({ is_active: true })
      .eq('id', req.params.id)
      .select()
      .single();

    console.log('Activate result:', data, 'Activate error:', error);

    if (error) throw error;
    res.json(toFrontend(data));
  } catch (error) {
    console.error('Activate session error:', error);
    res.status(500).json({ error: 'Failed to activate session' });
  }
});

// DELETE session
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const { data: session, error: findError } = await supabase
      .from('academic_sessions')
      .select('is_active')
      .eq('id', req.params.id)
      .single();

    if (findError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.is_active) {
      return res.status(400).json({ error: 'Cannot delete the active session. Activate another session first.' });
    }

    const { error } = await supabase
      .from('academic_sessions')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;


