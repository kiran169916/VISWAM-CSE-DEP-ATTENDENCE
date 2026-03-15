import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Plus, Upload, Edit, Trash2, X } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';

interface Student {
  student_id: number;
  student_name: string;
  roll_number: string;
  email: string;
  department: string;
  year: number;
  section: string;
  working_days?: number;
  present_days?: number;
}

export default function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', roll_number: '', email: '', department: 'CSE', year: 1, section: 'A' });
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students');
      setStudents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/student/${editingId}`, formData);
        
        // Update in Firestore
        const q = query(collection(db, 'students'), where('email', '==', formData.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docId = querySnapshot.docs[0].id;
          await updateDoc(doc(db, 'students', docId), {
            student_name: formData.name,
            roll_number: formData.roll_number,
            department: formData.department,
            year: formData.year,
            section: formData.section
          });
        }
        
        setMessage('Student updated successfully');
      } else {
        await api.post('/student/add', formData);
        
        // Add to Firestore
        await addDoc(collection(db, 'students'), {
          student_name: formData.name,
          roll_number: formData.roll_number,
          email: formData.email,
          department: formData.department,
          year: formData.year,
          section: formData.section
        });
        
        setMessage('Student added successfully');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', roll_number: '', email: '', department: 'CSE', year: 1, section: 'A' });
      fetchStudents();
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to save student');
    }
  };

  const handleEdit = (student: Student) => {
    setFormData({
      name: student.student_name,
      roll_number: student.roll_number,
      email: student.email,
      department: student.department,
      year: student.year,
      section: student.section
    });
    setEditingId(student.student_id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (student: Student) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      await api.delete(`/student/${student.student_id}`);
      
      // Delete from Firestore
      const q = query(collection(db, 'students'), where('email', '==', student.email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docId = querySnapshot.docs[0].id;
        await deleteDoc(doc(db, 'students', docId));
      }
      
      setMessage('Student deleted successfully');
      fetchStudents();
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to delete student');
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage('Students imported successfully');
      setFile(null);
      fetchStudents();
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to import students');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ name: '', roll_number: '', email: '', department: 'CSE', year: 1, section: 'A' });
              setShowForm(!showForm);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            {showForm ? <X className="-ml-1 mr-2 h-5 w-5" /> : <Plus className="-ml-1 mr-2 h-5 w-5" />}
            {showForm ? 'Cancel' : 'Add Student'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      {showForm && (
        <div className="bg-white shadow sm:rounded-lg p-6 border-t-4 border-blue-500">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{editingId ? 'Edit Student' : 'Add New Student'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 border px-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Roll Number</label>
                <input type="text" required value={formData.roll_number} onChange={e => setFormData({ ...formData, roll_number: e.target.value })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 border px-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 border px-3" disabled={!!editingId} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <input type="text" required value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 border px-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Year</label>
                <input type="number" required min="1" max="4" value={formData.year} onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 border px-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Section</label>
                <input type="text" required value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 border px-3" />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow sm:rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Import Students (CSV)</h3>
        <form onSubmit={handleImport} className="flex items-center space-x-4">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            type="submit"
            disabled={!file}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            <Upload className="-ml-1 mr-2 h-5 w-5" />
            Import
          </button>
        </form>
        <p className="mt-2 text-sm text-gray-500">CSV format: name,roll_number,email,department,year,section</p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Student Name
                </th>
                <th scope="col" className="px-3 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Roll Number
                </th>
                <th scope="col" className="px-3 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-3 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Department
                </th>
                <th scope="col" className="px-3 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Year
                </th>
                <th scope="col" className="px-3 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Section
                </th>
                <th scope="col" className="px-3 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Working Days
                </th>
                <th scope="col" className="px-3 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Days Present
                </th>
                <th scope="col" className="px-3 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Attendance %
                </th>
                <th scope="col" className="relative px-3 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((s) => {
                const workingDays = s.working_days || 0;
                const presentDays = s.present_days || 0;
                const percentage = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
                
                return (
                  <tr key={s.student_id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{s.student_name}</div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{s.roll_number}</div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap max-w-[150px] sm:max-w-[200px]">
                      <div className="text-sm text-gray-500 truncate" title={s.email}>{s.email}</div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{s.department}</div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{s.year}</div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{s.section}</div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{workingDays}</div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{presentDays}</div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        percentage >= 75 ? 'bg-green-100 text-green-800' : 
                        percentage >= 60 ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {percentage}%
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        <button onClick={() => handleEdit(s)} className="text-blue-600 hover:text-blue-900">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDelete(s)} className="text-red-600 hover:text-red-900">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
