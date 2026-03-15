import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';

interface Faculty {
  faculty_id: number;
  faculty_name: string;
  email: string;
  subject_assigned: string;
}

export default function FacultyManagement() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '' });
  const [message, setMessage] = useState('');

  const fetchFaculty = async () => {
    try {
      const res = await api.get('/faculty');
      setFaculty(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/faculty/${editingId}`, formData);
        
        // Update in Firestore
        const q = query(collection(db, 'faculty'), where('email', '==', formData.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docId = querySnapshot.docs[0].id;
          await updateDoc(doc(db, 'faculty', docId), {
            faculty_name: formData.name,
            subject_assigned: formData.subject
          });
        }
        
        setMessage('Faculty updated successfully');
      } else {
        await api.post('/faculty/add', formData);
        
        // Add to Firestore
        await addDoc(collection(db, 'faculty'), {
          faculty_name: formData.name,
          email: formData.email,
          subject_assigned: formData.subject
        });
        
        setMessage('Faculty added successfully');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', email: '', subject: '' });
      fetchFaculty();
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to save faculty');
    }
  };

  const handleEdit = (f: Faculty) => {
    setFormData({
      name: f.faculty_name,
      email: f.email,
      subject: f.subject_assigned
    });
    setEditingId(f.faculty_id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (f: Faculty) => {
    if (!window.confirm('Are you sure you want to delete this faculty member?')) return;
    try {
      await api.delete(`/faculty/${f.faculty_id}`);
      
      // Delete from Firestore
      const q = query(collection(db, 'faculty'), where('email', '==', f.email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docId = querySnapshot.docs[0].id;
        await deleteDoc(doc(db, 'faculty', docId));
      }
      
      setMessage('Faculty deleted successfully');
      fetchFaculty();
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to delete faculty');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Faculty Management</h1>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', email: '', subject: '' });
            setShowForm(!showForm);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          {showForm ? <X className="-ml-1 mr-2 h-5 w-5" /> : <Plus className="-ml-1 mr-2 h-5 w-5" />}
          {showForm ? 'Cancel' : 'Add Faculty'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      {showForm && (
        <div className="bg-white shadow sm:rounded-lg p-6 border-t-4 border-blue-500">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{editingId ? 'Edit Faculty' : 'Add New Faculty'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 border px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 border px-3"
                  disabled={!!editingId}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 border px-3"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {faculty.map((f) => (
            <li key={f.faculty_id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-blue-600 truncate">{f.faculty_name}</p>
                  <div className="ml-2 flex-shrink-0 flex space-x-2 items-center">
                    <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {f.subject_assigned}
                    </p>
                    <button onClick={() => handleEdit(f)} className="text-blue-600 hover:text-blue-900 ml-4">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(f)} className="text-red-600 hover:text-red-900">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      {f.email}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
