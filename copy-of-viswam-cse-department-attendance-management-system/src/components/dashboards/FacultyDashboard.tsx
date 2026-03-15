import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { format } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';

interface Subject {
  subject_id: number;
  subject_name: string;
}

interface Student {
  student_id: number;
  student_name: string;
  roll_number: string;
}

export default function FacultyDashboard() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<number | ''>('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendance, setAttendance] = useState<Record<number, 'Present' | 'Absent'>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subRes, stuRes] = await Promise.all([
          api.get('/subjects'),
          api.get('/students')
        ]);
        setSubjects(subRes.data);
        setStudents(stuRes.data);
        
        // Initialize all as present initially
        const initialAttendance: Record<number, 'Present' | 'Absent'> = {};
        stuRes.data.forEach((s: Student) => {
          initialAttendance[s.student_id] = 'Present';
        });
        setAttendance(initialAttendance);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedSubject && selectedDate) {
      const fetchExistingAttendance = async () => {
        try {
          const res = await api.get(`/attendance/date?date=${selectedDate}&subject_id=${selectedSubject}`);
          if (res.data.length > 0) {
            const existing: Record<number, 'Present' | 'Absent'> = {};
            res.data.forEach((record: any) => {
              existing[record.student_id] = record.status;
            });
            setAttendance(prev => ({ ...prev, ...existing }));
          } else {
             // Reset to all present if no existing record
             const initialAttendance: Record<number, 'Present' | 'Absent'> = {};
             students.forEach((s: Student) => {
               initialAttendance[s.student_id] = 'Present';
             });
             setAttendance(initialAttendance);
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchExistingAttendance();
    }
  }, [selectedSubject, selectedDate, students]);

  const handleMarkAllPresent = () => {
    const allPresent: Record<number, 'Present' | 'Absent'> = {};
    students.forEach(s => {
      allPresent[s.student_id] = 'Present';
    });
    setAttendance(allPresent);
  };

  const handleSave = async () => {
    if (!selectedSubject) {
      setMessage('Please select a subject');
      return;
    }

    setLoading(true);
    setMessage('');

    const attendanceData = Object.entries(attendance).map(([student_id, status]) => ({
      student_id: parseInt(student_id),
      status
    }));

    try {
      await api.post('/attendance/mark', {
        date: selectedDate,
        subject_id: selectedSubject,
        attendanceData
      });
      setShowSuccessPopup(true);
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>

      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <div className="flex space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(Number(e.target.value))}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
            >
              <option value="">Select Subject</option>
              {subjects.map(s => (
                <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
            />
          </div>
        </div>

        {message && !showSuccessPopup && (
          <div className={`p-3 rounded-md text-sm ${message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}

        {selectedSubject && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Student List</h3>
              <button
                onClick={handleMarkAllPresent}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
              >
                Mark All Present
              </button>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {students.map((student) => (
                  <li key={student.student_id}>
                    <div className="px-4 py-4 flex items-center justify-between sm:px-6">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-blue-600 truncate">
                          {student.student_name}
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            {student.roll_number}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setAttendance(prev => ({ ...prev, [student.student_id]: 'Present' }))}
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            attendance[student.student_id] === 'Present'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => setAttendance(prev => ({ ...prev, [student.student_id]: 'Absent' }))}
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            attendance[student.student_id] === 'Absent'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>
        )}
      </div>

      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Success!</h3>
            <p className="text-gray-600 text-center">Attendance saved successfully.</p>
            <button
              onClick={() => setShowSuccessPopup(false)}
              className="mt-6 w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
