import express from 'express';
import { supabase } from '../server.js';
import { authenticate, authorize } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();
router.use(authenticate);

const toFrontend = (row) => ({
  id: row.id,
  name: row.name,
  subject: row.subject,
  email: row.email,
  classes: row.classes || [],
  experience: row.experience || 0,
  status: row.status || 'Active',
  avatar: row.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=6366f1&color=fff`,
  username: row.username || '',
  role: row.role || 'teacher',         // ← new
  signature: row.signature || null      // ← new
});

// GET all teachers
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .order('name');
    if (error) throw error;
    res.json(data.map(toFrontend));
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// POST - add teacher
router.post('/', authorize('admin'), async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password || 'password', 10);
    const { data, error } = await supabase
      .from('teachers')
      .insert([{
        name: req.body.name,
        subject: req.body.subject,
        email: req.body.email,
        experience: Number(req.body.experience) || 0,
        classes: req.body.classes || [],
        username: req.body.username,
        password: hashedPassword,
        status: 'Active',
        role: req.body.role || 'teacher',   // ← new
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(req.body.name)}&background=6366f1&color=fff`
      }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(toFrontend(data));
  } catch (error) {
    console.error('Add teacher error:', error);
    res.status(500).json({ error: 'Failed to add teacher' });
  }
});

// PUT - update teacher
router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    const updateData = {
      name: req.body.name,
      subject: req.body.subject,
      email: req.body.email,
      experience: Number(req.body.experience) || 0,
      classes: req.body.classes || [],
      username: req.body.username,
      status: req.body.status || 'Active',
      role: req.body.role || 'teacher',    // ← new
    };

    if (req.body.password) {
      updateData.password = await bcrypt.hash(req.body.password, 10);
    }

    const { data, error } = await supabase
      .from('teachers')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(toFrontend(data));
  } catch (error) {
    console.error('Update teacher error:', error);
    res.status(500).json({ error: 'Failed to update teacher' });
  }
});

// PUT - upload/update signature (teacher updates their own, admin can update any)
router.put('/:id/signature', async (req, res) => {
  try {
    const { signatureUrl } = req.body;

    // Only allow own signature update or admin
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'You can only update your own signature' });
    }

    if (!signatureUrl) {
      return res.status(400).json({ error: 'signatureUrl is required' });
    }

    // Admin is not in teachers table — store in school_settings instead
    if (req.params.id === 'admin') {
      return res.json({ 
        id: 'admin', 
        signature: signatureUrl,
        message: 'Admin signature saved locally only' 
      });
    }

    const { data, error } = await supabase
      .from('teachers')
      .update({ signature: signatureUrl })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(toFrontend(data));
  } catch (error) {
    console.error('Update signature error:', error);
    res.status(500).json({ error: 'Failed to update signature' });
  }
});

// DELETE teacher
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('teachers')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Teacher deleted' });
  } catch (error) {
    console.error('Delete teacher error:', error);
    res.status(500).json({ error: 'Failed to delete teacher' });
  }
});

export default router;