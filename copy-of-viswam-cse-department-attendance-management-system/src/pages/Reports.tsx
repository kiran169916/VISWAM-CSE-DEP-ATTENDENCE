import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Download, Printer } from 'lucide-react';

interface ReportData {
  student_name: string;
  roll_number: string;
  subject_name: string;
  present_days: number;
  total_classes: number;
}

interface ProcessedReportData {
  student_name: string;
  roll_number: string;
  subjects: Record<string, { present: number; total: number }>;
  total_present: number;
  total_classes: number;
  percentage: number;
}

export default function Reports() {
  const [reportData, setReportData] = useState<ProcessedReportData[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.get('/attendance/report');
        const rawData: ReportData[] = res.data;
        
        const subjectSet = new Set<string>();
        const studentMap = new Map<string, ProcessedReportData>();

        rawData.forEach(row => {
          if (row.subject_name) {
            subjectSet.add(row.subject_name);
          }

          const key = row.roll_number;
          if (!studentMap.has(key)) {
            studentMap.set(key, {
              student_name: row.student_name,
              roll_number: row.roll_number,
              subjects: {},
              total_present: 0,
              total_classes: 0,
              percentage: 0
            });
          }

          const student = studentMap.get(key)!;
          if (row.subject_name) {
            student.subjects[row.subject_name] = {
              present: row.present_days,
              total: row.total_classes
            };
            student.total_present += row.present_days;
            student.total_classes += row.total_classes;
          }
        });

        const processed = Array.from(studentMap.values()).map(student => {
          student.percentage = student.total_classes > 0 
            ? Math.round((student.total_present / student.total_classes) * 100) 
            : 0;
          return student;
        });

        setSubjects(Array.from(subjectSet).sort());
        setReportData(processed);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    const headers = ['Student Name', 'Roll Number', ...subjects, 'Total Classes', 'Days Present', 'Attendance %'];
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => {
        const subjectCols = subjects.map(sub => {
          const data = row.subjects[sub];
          return data ? `"${data.present}/${data.total}"` : '"-"';
        });
        return `"${row.student_name}","${row.roll_number}",${subjectCols.join(',')},${row.total_classes},${row.total_present},${row.percentage}%`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'attendance_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div>Loading report...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Reports</h1>
        <div className="flex space-x-4">
          <button
            onClick={handleDownloadCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Printer className="-ml-1 mr-2 h-5 w-5" />
            Print
          </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg print:shadow-none">
        <div className="px-4 py-5 sm:px-6 print:hidden">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Department Attendance Record</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Detailed view of student attendance across subjects.</p>
        </div>
        <div className="border-t border-gray-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 print:bg-white">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                {subjects.map(sub => (
                  <th key={sub} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{sub}</th>
                ))}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Classes</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Present</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance %</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.student_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.roll_number}</td>
                  {subjects.map(sub => {
                    const data = row.subjects[sub];
                    return (
                      <td key={sub} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {data ? `${data.present} / ${data.total}` : '-'}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.total_classes}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.total_present}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      row.percentage >= 75 ? 'bg-green-100 text-green-800' : 
                      row.percentage >= 60 ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {row.percentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
