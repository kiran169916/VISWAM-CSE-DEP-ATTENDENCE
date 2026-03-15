import React, { useEffect, useState } from 'react';
import api from '../../lib/api';

interface AttendanceRecord {
  subject_name: string;
  present_days: number;
  total_classes: number;
}

export default function StudentDashboard() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await api.get('/attendance/student');
        setAttendance(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  if (loading) return <div>Loading attendance...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {attendance.map((record, index) => {
          const percentage = record.total_classes > 0 
            ? Math.round((record.present_days / record.total_classes) * 100) 
            : 0;
            
          return (
            <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {record.subject_name}
                      </dt>
                      <dd className="mt-2 text-3xl font-semibold text-gray-900">
                        {record.present_days} / {record.total_classes}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <span className={`font-medium ${percentage >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                    {percentage}% Attendance
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {attendance.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No attendance records found.</p>
        </div>
      )}
    </div>
  );
}
