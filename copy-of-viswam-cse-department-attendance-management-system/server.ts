import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

app.use(cors());
app.use(express.json());

// Database Setup
const db = new Database('attendance.db');

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('HOD', 'Faculty', 'Student'))
  );

  CREATE TABLE IF NOT EXISTS students (
    student_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT NOT NULL,
    roll_number TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    year INTEGER NOT NULL,
    section TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS faculty (
    faculty_id INTEGER PRIMARY KEY AUTOINCREMENT,
    faculty_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    subject_assigned TEXT
  );

  CREATE TABLE IF NOT EXISTS subjects (
    subject_id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_name TEXT NOT NULL,
    faculty_id INTEGER,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    attendance_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    faculty_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('Present', 'Absent')),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id),
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id),
    UNIQUE(student_id, subject_id, date)
  );
`);

// Seed Default Users
const seedData = () => {
  const stmt = db.prepare('SELECT * FROM users WHERE role = ?');
  const hod = stmt.get('HOD');
  if (!hod) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('HOD Admin', 'hod@viswam.edu', hash, 'HOD');
    console.log('HOD Admin seeded: hod@viswam.edu / admin123');
  }

  const faculty = db.prepare('SELECT * FROM users WHERE email = ?').get('faculty@viswam.edu');
  if (!faculty) {
    const hash = bcrypt.hashSync('faculty123', 10);
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Test Faculty', 'faculty@viswam.edu', hash, 'Faculty');
    const res = db.prepare('INSERT INTO faculty (faculty_name, email, subject_assigned) VALUES (?, ?, ?)').run('Test Faculty', 'faculty@viswam.edu', 'Computer Networks');
    db.prepare('INSERT INTO subjects (subject_name, faculty_id) VALUES (?, ?)').run('Computer Networks', res.lastInsertRowid);
    console.log('Test Faculty seeded: faculty@viswam.edu / faculty123');
  }

  const student = db.prepare('SELECT * FROM users WHERE email = ?').get('student@viswam.edu');
  if (!student) {
    const hash = bcrypt.hashSync('student123', 10);
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Test Student', 'student@viswam.edu', hash, 'Student');
    db.prepare('INSERT INTO students (student_name, roll_number, email, department, year, section) VALUES (?, ?, ?, ?, ?, ?)').run('Test Student', '1234567890', 'student@viswam.edu', 'CSE', 3, 'A');
    console.log('Test Student seeded: student@viswam.edu / student123');
  }
};
seedData();

// Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    next();
  };
};

// --- API Routes ---

// Auth
app.post('/api/login-firebase', (req, res) => {
  const { email, role } = req.body;
  
  // In a real app, we would verify the Firebase ID token here.
  // For this prototype, we trust the frontend has authenticated the user with Firebase.
  
  let user = db.prepare('SELECT * FROM users WHERE email = ? AND role = ?').get(email, role) as any;
  
  if (!user) {
    // If the user doesn't exist in the users table but exists in faculty/students,
    // we can auto-create them in the users table to maintain foreign key constraints
    // or just issue a token. Let's auto-create them.
    let name = '';
    if (role === 'Faculty') {
      const faculty = db.prepare('SELECT * FROM faculty WHERE email = ?').get(email) as any;
      if (!faculty) return res.status(401).json({ error: 'Access Denied: Your email is not registered as faculty.' });
      name = faculty.faculty_name;
    } else if (role === 'Student') {
      const student = db.prepare('SELECT * FROM students WHERE email = ?').get(email) as any;
      if (!student) return res.status(401).json({ error: 'Access Denied: Your email is not registered as a student.' });
      name = student.student_name;
    } else if (role === 'HOD') {
      name = 'HOD';
    } else {
      return res.status(401).json({ error: 'Invalid role.' });
    }
    
    const result = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(name, email, 'firebase-managed', role);
    user = { user_id: result.lastInsertRowid, email, role, name };
  }

  const token = jwt.sign({ id: user.user_id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.user_id, email: user.email, role: user.role, name: user.name } });
});

app.post('/api/login', (req, res) => {
  const { email, password, role } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND role = ?').get(email, role) as any;
  if (!user) {
    // Check if it's a faculty or student trying to login without a user account yet
    if (role === 'Faculty') {
      const faculty = db.prepare('SELECT * FROM faculty WHERE email = ?').get(email) as any;
      if (faculty) return res.status(401).json({ error: 'Please set up your password first.' });
    } else if (role === 'Student') {
      const student = db.prepare('SELECT * FROM students WHERE email = ?').get(email) as any;
      if (student) return res.status(401).json({ error: 'Please set up your password first.' });
      return res.status(401).json({ error: 'Access Denied: Your email is not registered by the department.' });
    }
    return res.status(401).json({ error: 'Access denied. Your email is not registered for this role.' });
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.user_id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.user_id, email: user.email, role: user.role, name: user.name } });
});

app.get('/api/me', authenticateToken, (req: any, res) => {
  res.json(req.user);
});

// Setup Password for Faculty/Students (Simplified for demo)
app.post('/api/setup-password', (req, res) => {
  const { email, password, role } = req.body;
  
  let name = '';
  if (role === 'Faculty') {
    const faculty = db.prepare('SELECT * FROM faculty WHERE email = ?').get(email) as any;
    if (!faculty) return res.status(400).json({ error: 'Email not registered as Faculty.' });
    name = faculty.faculty_name;
  } else if (role === 'Student') {
    const student = db.prepare('SELECT * FROM students WHERE email = ?').get(email) as any;
    if (!student) return res.status(400).json({ error: 'Email not registered as Student.' });
    name = student.student_name;
  } else {
    return res.status(400).json({ error: 'Invalid role for setup.' });
  }
  
  const existingUser = db.prepare('SELECT * FROM users WHERE email = ? AND role = ?').get(email, role);
  if (existingUser) {
     return res.status(400).json({ error: 'Account already set up.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  
  db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(name, email, hash, role);
  res.json({ message: 'Password set successfully. You can now login.' });
});

// HOD: Manage Faculty
app.post('/api/faculty/add', authenticateToken, requireRole(['HOD']), (req, res) => {
  const { name, email, subject } = req.body;
  try {
    const result = db.prepare('INSERT INTO faculty (faculty_name, email, subject_assigned) VALUES (?, ?, ?)').run(name, email, subject);
    // Also create subject
    db.prepare('INSERT INTO subjects (subject_name, faculty_id) VALUES (?, ?)').run(subject, result.lastInsertRowid);
    res.json({ message: 'Faculty added successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/faculty/:id', authenticateToken, requireRole(['HOD']), (req, res) => {
  const { id } = req.params;
  const { name, email, subject } = req.body;
  try {
    db.prepare('UPDATE faculty SET faculty_name = ?, email = ?, subject_assigned = ? WHERE faculty_id = ?').run(name, email, subject, id);
    db.prepare('UPDATE subjects SET subject_name = ? WHERE faculty_id = ?').run(subject, id);
    res.json({ message: 'Faculty updated successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/faculty/:id', authenticateToken, requireRole(['HOD']), (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM subjects WHERE faculty_id = ?').run(id);
    db.prepare('DELETE FROM faculty WHERE faculty_id = ?').run(id);
    res.json({ message: 'Faculty deleted successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/faculty', authenticateToken, requireRole(['HOD']), (req, res) => {
  const faculty = db.prepare('SELECT * FROM faculty').all();
  res.json(faculty);
});

// Manage Students
app.post('/api/student/add', authenticateToken, requireRole(['HOD', 'Faculty']), (req, res) => {
  const { name, roll_number, email, department, year, section } = req.body;
  try {
    db.prepare('INSERT INTO students (student_name, roll_number, email, department, year, section) VALUES (?, ?, ?, ?, ?, ?)').run(name, roll_number, email, department, year, section);
    res.json({ message: 'Student added successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/student/:id', authenticateToken, requireRole(['HOD', 'Faculty']), (req, res) => {
  const { id } = req.params;
  const { name, roll_number, email, department, year, section } = req.body;
  try {
    db.prepare('UPDATE students SET student_name = ?, roll_number = ?, email = ?, department = ?, year = ?, section = ? WHERE student_id = ?').run(name, roll_number, email, department, year, section, id);
    res.json({ message: 'Student updated successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/student/:id', authenticateToken, requireRole(['HOD', 'Faculty']), (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM students WHERE student_id = ?').run(id);
    res.json({ message: 'Student deleted successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/students', authenticateToken, (req, res) => {
  const students = db.prepare(`
    SELECT 
      s.*,
      COUNT(a.attendance_id) as working_days,
      SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_days
    FROM students s
    LEFT JOIN attendance a ON s.student_id = a.student_id
    GROUP BY s.student_id
  `).all();
  res.json(students);
});

// Import Students via CSV
const upload = multer({ dest: 'uploads/' });
app.post('/api/students/import', authenticateToken, requireRole(['HOD']), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  const results: any[] = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      const insert = db.prepare('INSERT OR IGNORE INTO students (student_name, roll_number, email, department, year, section) VALUES (?, ?, ?, ?, ?, ?)');
      const insertMany = db.transaction((students) => {
        for (const student of students) {
          insert.run(student.name, student.roll_number, student.email, student.department, student.year, student.section);
        }
      });
      insertMany(results);
      fs.unlinkSync(req.file!.path);
      res.json({ message: 'Students imported successfully' });
    });
});

// Faculty: Subjects
app.get('/api/subjects', authenticateToken, (req: any, res) => {
  if (req.user.role === 'Faculty') {
    const faculty = db.prepare('SELECT faculty_id FROM faculty WHERE email = ?').get(req.user.email) as any;
    if (faculty) {
      const subjects = db.prepare('SELECT * FROM subjects WHERE faculty_id = ?').all(faculty.faculty_id);
      return res.json(subjects);
    }
  }
  const subjects = db.prepare('SELECT * FROM subjects').all();
  res.json(subjects);
});

// Faculty: Mark Attendance
app.post('/api/attendance/mark', authenticateToken, requireRole(['Faculty']), (req: any, res) => {
  const { date, subject_id, attendanceData } = req.body; // attendanceData: [{student_id, status}]
  
  const faculty = db.prepare('SELECT faculty_id FROM faculty WHERE email = ?').get(req.user.email) as any;
  if (!faculty) return res.status(400).json({ error: 'Faculty not found' });

  try {
    const insert = db.prepare('INSERT INTO attendance (student_id, subject_id, faculty_id, date, status) VALUES (?, ?, ?, ?, ?) ON CONFLICT(student_id, subject_id, date) DO UPDATE SET status=excluded.status, timestamp=CURRENT_TIMESTAMP');
    const insertMany = db.transaction((records) => {
      for (const record of records) {
        insert.run(record.student_id, subject_id, faculty.faculty_id, date, record.status);
      }
    });
    insertMany(attendanceData);
    res.json({ message: 'Attendance saved successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get Attendance for a specific date and subject (for Faculty to view/edit)
app.get('/api/attendance/date', authenticateToken, requireRole(['Faculty', 'HOD']), (req, res) => {
  const { date, subject_id } = req.query;
  const attendance = db.prepare('SELECT * FROM attendance WHERE date = ? AND subject_id = ?').all(date, subject_id);
  res.json(attendance);
});

// Student: View Attendance
app.get('/api/attendance/student', authenticateToken, requireRole(['Student']), (req: any, res) => {
  const student = db.prepare('SELECT student_id FROM students WHERE email = ?').get(req.user.email) as any;
  if (!student) return res.status(400).json({ error: 'Student not found' });

  const attendance = db.prepare(`
    SELECT s.subject_name, 
           SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_days,
           COUNT(a.attendance_id) as total_classes
    FROM attendance a
    JOIN subjects s ON a.subject_id = s.subject_id
    WHERE a.student_id = ?
    GROUP BY a.subject_id
  `).all(student.student_id);
  
  res.json(attendance);
});

// HOD: Analytics & Reports
app.get('/api/attendance/analytics', authenticateToken, requireRole(['HOD']), (req, res) => {
  const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students').get() as any;
  const today = new Date().toISOString().split('T')[0];
  
  const todayAttendance = db.prepare(`
    SELECT 
      SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent
    FROM attendance WHERE date = ?
  `).get(today) as any;

  // Monthly trend (last 30 days)
  const trend = db.prepare(`
    SELECT date, 
           SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
           SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent
    FROM attendance
    GROUP BY date
    ORDER BY date DESC
    LIMIT 30
  `).all();

  res.json({
    totalStudents: totalStudents.count,
    todayPresent: todayAttendance.present || 0,
    todayAbsent: todayAttendance.absent || 0,
    trend: trend.reverse()
  });
});

app.get('/api/attendance/report', authenticateToken, requireRole(['HOD']), (req, res) => {
  const report = db.prepare(`
    SELECT st.student_name, st.roll_number, su.subject_name,
           SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_days,
           COUNT(a.attendance_id) as total_classes
    FROM students st
    LEFT JOIN attendance a ON st.student_id = a.student_id
    LEFT JOIN subjects su ON a.subject_id = su.subject_id
    GROUP BY st.student_id, su.subject_id
  `).all();
  res.json(report);
});

// HOD Profile Update
app.post('/api/hod/profile', authenticateToken, requireRole(['HOD']), (req: any, res) => {
  const { newEmail } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.user.id) as any;
  
  if (!newEmail) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const email = newEmail || user.email;

  db.prepare('UPDATE users SET email = ? WHERE user_id = ?').run(email, req.user.id);
  res.json({ message: 'Profile updated successfully' });
});


// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
