import express from 'express';
import { supabase } from '../server.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('school_settings').select('*').limit(1).single();
    
    // If no settings exist yet, return defaults
    if (error && error.code === 'PGRST116') {
      return res.json({
        name: 'Lincoln High School',
        logo: '',
        address: '',
        email: '',
        phone: '',
        primaryColor: '#4f46e5',
        enableAI: true,
        permissions: {
          teacher: { 
            canManageStudents: true, 
            canEnterResults: true, 
            canViewAllStudents: true, 
            canEditProfiles: false, 
            canViewBroadsheet: true 
          },
          parent: { 
            canViewResults: true, 
            canViewAttendance: true, 
            canViewRemarks: true 
          }
        }
      });
    }
    
    if (error) throw error;
    
    // Transform snake_case to camelCase for frontend
    const settings = {
      name: data.name,
      logo: data.logo,
      address: data.address,
      email: data.email,
      phone: data.phone,
      primaryColor: data.primary_color,
      enableAI: data.enable_ai,
      permissions: data.permissions
    };
    
    res.json(settings);
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/', authorize('admin'), async (req, res) => {
  try {
    // Get the existing settings row
    const { data: existing } = await supabase.from('school_settings').select('id').limit(1).single();
    
    const updateData = {
      name: req.body.name,
      logo: req.body.logo,
      address: req.body.address,
      email: req.body.email,
      phone: req.body.phone,
      primary_color: req.body.primaryColor,
      enable_ai: req.body.enableAI,
      permissions: req.body.permissions,
      updated_at: new Date().toISOString()
    };
    
    let data, error;
    
    if (existing) {
      // Update existing
      ({ data, error } = await supabase
        .from('school_settings')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single());
    } else {
      // Create new
      ({ data, error } = await supabase
        .from('school_settings')
        .insert([updateData])
        .select()
        .single());
    }
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;