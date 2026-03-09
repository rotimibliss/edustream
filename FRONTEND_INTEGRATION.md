# Frontend Integration Guide

## 🎯 How to Connect Your Frontend to the Backend API

Your frontend is currently using `localStorage` via `dataService.ts`. We've created `apiService.ts` that talks to the real backend instead. Here's how to switch:

## 📝 Step-by-Step Integration

### Step 1: Add Environment Variable

Create a file `.env` in your frontend root (where `package.json` is):

```env
VITE_API_URL=http://localhost:3001/api
```

For production:
```env
VITE_API_URL=https://your-backend-url.com/api
```

### Step 2: Choose Your Approach

You have 2 options:

#### Option A: Gradual Migration (Recommended)
Test the API with one feature at a time.

#### Option B: Complete Switch
Replace all at once (faster but riskier).

## 🔄 Option A: Gradual Migration

### Test with Login First

1. Open `components/Login.tsx`
2. Change the import:

```typescript
// OLD
import { dataService } from '../services/dataService';

// NEW
import { apiService } from '../services/apiService';
```

3. Update the login call (it stays the same!):

```typescript
const user = await apiService.login(username, password);
```

**That's it!** The API service has the same interface.

### Then Test Students

1. Open `components/StudentManagement.tsx`
2. Change import:

```typescript
import { apiService as dataService } from '../services/apiService';
```

Notice the `as dataService` - this means you don't have to change any other code!

3. Test adding, editing, deleting students

### Continue with Other Components

Repeat for each component:
- TeacherManagement
- ClassManagement
- ResultManagement
- etc.

## 🚀 Option B: Complete Switch

### Global Replace

1. Open `App.tsx`
2. Add at the top:

```typescript
// Import API service
import { apiService } from './services/apiService';

// Make it available globally (optional)
window.dataService = apiService;
```

3. In every component file, change:

```typescript
// OLD
import { dataService } from '../services/dataService';

// NEW  
import { apiService as dataService } from '../services/apiService';
```

**OR** create an alias in `vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/services/dataService': '/src/services/apiService.ts'
    }
  }
})
```

Then you don't need to change any imports!

## 🔧 Handling Loading States

Your API calls are now async, so add loading states:

### Example: StudentManagement

```typescript
const [students, setStudents] = useState<Student[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const loadStudents = async () => {
  setLoading(true);
  setError(null);
  try {
    const data = await dataService.getStudents();
    setStudents(data);
  } catch (err) {
    setError('Failed to load students');
    console.error(err);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadStudents();
}, []);

// In your JSX:
if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error}</div>;
```

## 🎨 Using Special Endpoints

### For Broadsheet Component

Replace your current data fetching with:

```typescript
const loadBroadsheetData = async () => {
  setLoading(true);
  try {
    const data = await dataService.getBroadsheetData(
      selectedClassId,
      session.year,
      session.term
    );
    
    // data contains: { students, subjects, meta }
    setStudents(data.students); // Already ranked!
    setSubjects(data.subjects);
  } catch (error) {
    console.error('Broadsheet error:', error);
  } finally {
    setLoading(false);
  }
};
```

### For ClassPerformance Component

```typescript
const loadPerformanceData = async () => {
  setLoading(true);
  try {
    const data = await dataService.getPerformanceData(
      selectedClassId,
      session.year,
      session.term
    );
    
    // data contains: { gradeDistribution, classAverage, topPerformers }
    setPerformanceData(data);
  } catch (error) {
    console.error('Performance error:', error);
  } finally {
    setLoading(false);
  }
};
```

## 🐛 Common Issues & Solutions

### Issue: "Cannot read property 'token' of undefined"
**Solution:** Make sure backend is running on `http://localhost:3001`

### Issue: "CORS error"
**Solution:** Backend has CORS enabled. Check `FRONTEND_URL` in backend `.env` matches your frontend URL.

### Issue: "401 Unauthorized"
**Solution:** Your token expired. Login again.

### Issue: "Network request failed"
**Solution:** 
1. Check backend is running: `http://localhost:3001/health`
2. Check `VITE_API_URL` in frontend `.env`

## 📊 Testing Your Integration

### 1. Test Login
```
✅ Can login as Admin (Admin / admin123)
✅ Token is saved to localStorage
✅ User info appears in header
```

### 2. Test CRUD Operations
```
✅ Create new student
✅ Edit student details
✅ Delete student
✅ Same for teachers, classes, etc.
```

### 3. Test Results Features
```
✅ Broadsheet displays correctly
✅ Performance analytics load
✅ Sorting and filtering work
```

## 🎓 How to Add New Features from AI Studio

When AI Studio creates a new component:

1. **Copy component to your project**
2. **No changes needed!** Component uses `dataService`
3. **If it's a new data type:**
   - Add endpoint to backend (`/routes/newfeature.js`)
   - Add method to `apiService.ts`
   - Component automatically works!

### Example: AI Studio Creates "Attendance" Feature

1. Backend route (`/routes/attendance.js`):
```javascript
router.get('/attendance', async (req, res) => {
  const data = await supabase.from('attendance').select('*');
  res.json(data);
});
```

2. Add to `apiService.ts`:
```typescript
getAttendance: async (): Promise<Attendance[]> => {
  return await api.get('/attendance');
}
```

3. Component from AI Studio works immediately!

## 🚢 Ready for Production

Once everything works locally:

1. **Deploy backend** (Railway/Render)
2. **Update frontend `.env`:**
   ```env
   VITE_API_URL=https://your-backend.railway.app/api
   ```
3. **Build frontend:**
   ```bash
   npm run build
   ```
4. **Deploy frontend** (Vercel/WhoGoHost)

## ✅ Checklist

- [ ] Backend running on port 3001
- [ ] Database schema created in Supabase
- [ ] Frontend `.env` configured
- [ ] Login works
- [ ] Students CRUD works
- [ ] Teachers CRUD works
- [ ] Results work
- [ ] Broadsheet loads
- [ ] Performance analytics load
- [ ] All tests pass

## 🆘 Need Help?

If you get stuck, check:
1. Backend logs (terminal where server is running)
2. Browser console (F12)
3. Network tab (F12 → Network)
4. Backend health check: `http://localhost:3001/health`

---

**You're all set!** Your app now has a real backend with database persistence. AI Studio can keep creating components, and they'll just work! 🎉
