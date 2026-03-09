import express from 'express';
import { supabase } from '../server.js';
import { authenticate, authorize } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();
router.use(authenticate);

const toFrontend = (row) => ({
  id: row.id,
  title: row.title || '',
  name: row.name,
  phone: row.phone || '',
  email: row.email || '',
  address: row.address || '',
  religion: row.religion || '',
  occupation: row.occupation || '',
  stateOfOrigin: row.state_of_origin || '',
  maritalStatus: row.marital_status || '',
  username: row.username || ''
});

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('parents')
      .select('*')
      .order('name');
    if (error) throw error;
    res.json(data.map(toFrontend));
  } catch (error) {
    console.error('Get parents error:', error);
    res.status(500).json({ error: 'Failed to fetch parents' });
  }
});

router.post('/', authorize('admin'), async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password || 'password', 10);
    const { data, error } = await supabase
      .from('parents')
      .insert([{
        title: req.body.title || '',
        name: req.body.name,
        phone: req.body.phone || '',
        email: req.body.email || '',
        address: req.body.address || '',
        religion: req.body.religion || '',
        occupation: req.body.occupation || '',
        state_of_origin: req.body.stateOfOrigin || '',
        marital_status: req.body.maritalStatus || '',
        username: req.body.username || '',
        password: hashedPassword
      }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(toFrontend(data));
  } catch (error) {
    console.error('Add parent error:', error);
    res.status(500).json({ error: 'Failed to add parent' });
  }
});

router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    const updateData = {
      title: req.body.title || '',
      name: req.body.name,
      phone: req.body.phone || '',
      email: req.body.email || '',
      address: req.body.address || '',
      religion: req.body.religion || '',
      occupation: req.body.occupation || '',
      state_of_origin: req.body.stateOfOrigin || '',
      marital_status: req.body.maritalStatus || '',
      username: req.body.username || ''
    };
    if (req.body.password) {
      updateData.password = await bcrypt.hash(req.body.password, 10);
    }
    const { data, error } = await supabase
      .from('parents')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(toFrontend(data));
  } catch (error) {
    console.error('Update parent error:', error);
    res.status(500).json({ error: 'Failed to update parent' });
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('parents')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Parent deleted' });
  } catch (error) {
    console.error('Delete parent error:', error);
    res.status(500).json({ error: 'Failed to delete parent' });
  }
});

export default router;