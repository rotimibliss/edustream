import express from 'express';
import { supabase } from '../server.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// GET /api/traits/affective
router.get('/affective', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('traits')
      .select('*')
      .eq('type', 'affective')
      .order('name');
    if (error) throw error;
    res.json(data.map(t => ({ id: t.id, name: t.name, type: t.type })));
  } catch (error) {
    console.error('Get affective traits error:', error);
    res.status(500).json({ error: 'Failed to fetch affective traits' });
  }
});

// GET /api/traits/psychomotor
router.get('/psychomotor', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('traits')
      .select('*')
      .eq('type', 'psychomotor')
      .order('name');
    if (error) throw error;
    res.json(data.map(t => ({ id: t.id, name: t.name, type: t.type })));
  } catch (error) {
    console.error('Get psychomotor traits error:', error);
    res.status(500).json({ error: 'Failed to fetch psychomotor traits' });
  }
});

// GET /api/traits (all traits)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('traits').select('*').order('type').order('name');
    if (error) throw error;
    res.json(data.map(t => ({ id: t.id, name: t.name, type: t.type })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch traits' });
  }
});

// POST /api/traits/affective
router.post('/affective', authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('traits')
      .insert([{ name: req.body.name, type: 'affective' }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ id: data.id, name: data.name, type: data.type });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create affective trait' });
  }
});

// POST /api/traits/psychomotor
router.post('/psychomotor', authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('traits')
      .insert([{ name: req.body.name, type: 'psychomotor' }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ id: data.id, name: data.name, type: data.type });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create psychomotor trait' });
  }
});

// DELETE /api/traits/affective/:id
router.delete('/affective/:id', authorize('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('traits').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Trait deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete trait' });
  }
});

// DELETE /api/traits/psychomotor/:id
router.delete('/psychomotor/:id', authorize('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('traits').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Trait deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete trait' });
  }
});

export default router;
