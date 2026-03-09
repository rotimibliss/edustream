// Authentication Routes
// Handles login, logout, and password management

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../server.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      role: user.role,
      name: user.name,
      signature: user.signature || null // ← add this
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Check admin user
    if (
  username === process.env.ADMIN_USERNAME &&
  password === process.env.ADMIN_PASSWORD
) {
      // TODO: In production, admin password should be hashed in database
      const adminUser = {
        id: 'admin',
        name: 'System Admin',
        role: 'admin',
        avatar: 'https://picsum.photos/seed/admin/100'
      };

      const token = generateToken(adminUser);

      return res.json({
        user: adminUser,
        token
      });
    }

    // Check teachers
    // Check teachers
const { data: teachers, error: teacherError } = await supabase
  .from('teachers')
  .select('*')
  .eq('username', username)
  .single();

if (teachers && !teacherError) {
  const passwordMatch = await bcrypt.compare(password, teachers.password);
  
  if (passwordMatch) {
    const user = {
      id: teachers.id,
      name: teachers.name,
      role: teachers.role || 'teacher', // ← reads from DB now
      avatar: teachers.avatar,
      signature: teachers.signature || null // ← include signature URL
    };

    const token = generateToken(user);
    return res.json({ user, token });
  }
}

    // Check parents
    const { data: parents, error: parentError } = await supabase
      .from('parents')
      .select('*')
      .eq('username', username)
      .single();

    if (parents && !parentError) {
      const passwordMatch = await bcrypt.compare(password, parents.password);
      
      if (passwordMatch) {
        const user = {
          id: parents.id,
          name: parents.name,
          role: 'parent',
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(parents.name)}&background=random`
        };

        const token = generateToken(user);

        return res.json({
          user,
          token
        });
      }
    }

    // Invalid credentials
    return res.status(401).json({ error: 'Invalid username or password' });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client should delete token)
 */
router.post('/logout', authenticate, (req, res) => {
  // With JWT, logout is handled client-side by removing the token
  // This endpoint exists for logging/tracking purposes
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get user based on role
    let table = userRole === 'teacher' ? 'teachers' : 'parents';
    
    const { data: user, error } = await supabase
      .from(table)
      .select('password')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const { error: updateError } = await supabase
      .from(table)
      .update({ password: hashedPassword })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
