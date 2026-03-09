import express from 'express';
import { supabase } from '../server.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Helper: transform DB row to frontend format
const toFrontend = (row) => ({
  id: row.id,
  name: row.name,
  arm: row.arm,
  classTeacherId: row.class_teacher_id
});

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('name');
    if (error) throw error;
    res.json(data.map(toFrontend));
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

router.post('/', authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .insert([{
        name: req.body.name,
        arm: req.body.arm,
        class_teacher_id: req.body.classTeacherId || null
      }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(toFrontend(data));
  } catch (error) {
    console.error('Add class error:', error);
    res.status(500).json({ error: 'Failed to add class' });
  }
});

router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .update({
        name: req.body.name,
        arm: req.body.arm,
        class_teacher_id: req.body.classTeacherId || null
      })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(toFrontend(data));
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Class deleted' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

export default router;