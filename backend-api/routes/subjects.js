import express from 'express';
import { supabase } from '../server.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Get all subjects WITH their class and teacher relationships
router.get('/', async (req, res) => {
  try {
    // Get all subjects
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('*')
      .order('name');
    if (subjectsError) throw subjectsError;

    // Get all class_subjects relationships
    const { data: relationships, error: relError } = await supabase
      .from('class_subjects')
      .select('*');
    if (relError) throw relError;

    // Merge relationships into each subject
    const result = subjects.map(sub => {
      const subRels = relationships.filter(r => r.subject_id === sub.id);
      const classIds = subRels.map(r => r.class_id).filter(Boolean);
      // Use first teacher found (subjects can have one teacher)
      const teacherId = subRels.find(r => r.teacher_id)?.teacher_id || '';

      return {
        id: sub.id,
        name: sub.name,
        isElective: sub.is_elective || false,
        classIds: classIds,
        teacherId: teacherId,
        studentIds: []
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// Create subject + save relationships
router.post('/', authorize('admin'), async (req, res) => {
  try {
    const { name, isElective, classIds = [], teacherId = '' } = req.body;

    // 1. Insert subject
    const { data: subject, error: subError } = await supabase
      .from('subjects')
      .insert([{ name, is_elective: isElective || false }])
      .select()
      .single();
    if (subError) throw subError;

    // 2. Save class_subjects relationships
    if (classIds.length > 0 || teacherId) {
      const rows = classIds.length > 0
        ? classIds.map(classId => ({
            subject_id: subject.id,
            class_id: classId || null,
            teacher_id: teacherId || null
          }))
        : [{ subject_id: subject.id, class_id: null, teacher_id: teacherId || null }];

      const { error: relError } = await supabase
        .from('class_subjects')
        .insert(rows);
      if (relError) console.error('Relationship save error:', relError);
    }

    res.status(201).json({
      id: subject.id,
      name: subject.name,
      isElective: subject.is_elective,
      classIds,
      teacherId,
      studentIds: []
    });
  } catch (error) {
    console.error('Add subject error:', error);
    res.status(500).json({ error: 'Failed to add subject' });
  }
});

// Update subject + update relationships
router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    const { name, isElective, classIds = [], teacherId = '' } = req.body;
    const subjectId = req.params.id;

    // 1. Update subject
    const { data: subject, error: subError } = await supabase
      .from('subjects')
      .update({ name, is_elective: isElective || false })
      .eq('id', subjectId)
      .select()
      .single();
    if (subError) throw subError;

    // 2. Delete old relationships
    const { error: deleteError } = await supabase
      .from('class_subjects')
      .delete()
      .eq('subject_id', subjectId);
    if (deleteError) {
      console.error('Delete relationships error:', JSON.stringify(deleteError));
    }

    // 3. Insert new relationships
    console.log('Saving relationships - classIds:', classIds, 'teacherId:', teacherId);
    if (classIds.length > 0 || teacherId) {
      const rows = classIds.length > 0
        ? classIds.map(classId => ({
            subject_id: subjectId,
            class_id: classId || null,
            teacher_id: teacherId || null
          }))
        : [{ subject_id: subjectId, class_id: null, teacher_id: teacherId || null }];

      console.log('Inserting rows into class_subjects:', JSON.stringify(rows));
      const { data: relData, error: relError } = await supabase
        .from('class_subjects')
        .insert(rows)
        .select();
      if (relError) {
        console.error('Relationship update error:', JSON.stringify(relError));
      } else {
        console.log('Relationships saved successfully:', JSON.stringify(relData));
      }
    } else {
      console.log('No classIds or teacherId provided - skipping relationship save');
    }

    res.json({
      id: subject.id,
      name: subject.name,
      isElective: subject.is_elective,
      classIds,
      teacherId,
      studentIds: []
    });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

// Delete subject + relationships
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    // Delete relationships first
    await supabase
      .from('class_subjects')
      .delete()
      .eq('subject_id', req.params.id);

    // Delete subject
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;

    res.json({ message: 'Subject deleted' });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

export default router;
