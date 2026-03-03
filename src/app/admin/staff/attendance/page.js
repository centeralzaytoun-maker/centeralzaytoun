'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase-browser';
import { useAuth } from '../../../../context/AuthContext';
import {
  FaClock, FaUsers, FaCheckCircle,
  FaArrowLeft, FaDownload, FaCalendarAlt,
  FaUserClock, FaSync, FaEdit, FaTimes, FaMapMarkerAlt, FaDesktop
} from 'react-icons/fa';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import toast, { Toaster } from 'react-hot-toast';
import AccessDenied from '../../../../components/AccessDenied';

export default function StaffAttendancePage() {
  const { centerId, allowedFeatures, loading: authLoading, user } = useAuth();

  if (!authLoading && allowedFeatures && !allowedFeatures.includes('staff:view')) {
    return <AccessDenied />;
  }

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [staffList, setStaffList] = useState([]);

  // ── Manual Override Modal ──
  const [editModal, setEditModal] = useState(null); // { record }
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (centerId) fetchAttendance();
  }, [centerId, selectedDate]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('center_id', centerId)
        .eq('date', selectedDate)
        .order('check_in', { ascending: true });

      if (error) throw error;
      setRecords(data || []);
      const names = [...new Set((data || []).map(r => r.staff_name).filter(Boolean))];
      setStaffList(names);
    } catch (e) {
      toast.error('خطأ في جلب بيانات الحضور');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (record) => {
    setEditModal(record);
    setEditCheckIn(record.check_in ? toLocalDatetimeInput(record.check_in) : '');
    setEditCheckOut(record.check_out ? toLocalDatetimeInput(record.check_out) : '');
    setEditReason('');
  };

  const toLocalDatetimeInput = (isoStr) => {
    const d = new Date(isoStr);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleSaveEdit = async () => {
    if (!editReason.trim()) {
      toast.error('يجب كتابة سبب التعديل');
      return;
    }
    setEditLoading(true);
    try {
      const newCheckIn = editCheckIn ? new Date(editCheckIn).toISOString() : editModal.check_in;
      const newCheckOut = editCheckOut ? new Date(editCheckOut).toISOString() : null;
      const diff = newCheckOut ? new Date(newCheckOut) - new Date(newCheckIn) : null;
      const durationMinutes = diff ? Math.floor(diff / 60000) : null;

      const { error } = await supabase
        .from('staff_attendance')
        .update({
          check_in:            newCheckIn,
          check_out:           newCheckOut,
          duration_minutes:    durationMinutes,
          status:              'modified',
          is_modified:         true,
          modified_by:         user?.id,
          modified_at:         new Date().toISOString(),
          modification_reason: editReason
        })
        .eq('id', editModal.id);

      if (error) throw error;
      toast.success('تم تعديل السجل بنجاح ✅');
      setEditModal(null);
      fetchAttendance();
    } catch (e) {
      toast.error('خطأ أثناء التعديل');
    } finally {
      setEditLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    if (!selectedStaff) return records;
    return records.filter(r => r.staff_name === selectedStaff);
  }, [records, selectedStaff]);

  const stats = useMemo(() => {
    const present = records.filter(r => r.check_in).length;
    const left = records.filter(r => r.check_out).length;
    const totalMins = records
      .filter(r => r.duration_minutes)
      .reduce((s, r) => s + r.duration_minutes, 0);
    const avgHours = left > 0 ? (totalMins / 60 / left).toFixed(1) : 0;
    const modified = records.filter(r => r.is_modified).length;
    return { present, left, avgHours, modified };
  }, [records]);

  const formatTime = (ts) => {
    if (!ts) return '---';
    return new Date(ts).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  const getDuration = (mins) => {
    if (!mins) return '---';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}س ${m}د`;
  };

  const getStatusBadge = (r) => {
    if (r.is_modified) return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-[9px] font-black border border-amber-200">✏️ معدّل</span>;
    if (r.status === 'auto_out') return <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-[9px] font-black border border-red-200">⚠️ خروج تلقائي</span>;
    if (r.check_out) return <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-[9px] font-black border border-emerald-200">✅ انصرف</span>;
    return <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-[9px] font-black border border-blue-200 animate-pulse">🟢 حاضر</span>;
  };

  const exportToExcel = () => {
    const rows = filteredRecords.map(r => ({
      'الموظف': r.staff_name || '---',
      'دخول': formatTime(r.check_in),
      'خروج': formatTime(r.check_out),
      'مدة العمل': getDuration(r.duration_minutes),
      'الحالة': r.is_modified ? 'معدّل' : r.status,
      'GPS': r.latitude ? `${r.latitude}, ${r.longitude}` : '---',
      'الجهاز': r.device_info?.substring(0, 50) || '---',
      'سبب التعديل': r.modification_reason || '---',
      'التاريخ': r.date
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الحضور');
    XLSX.writeFile(wb, `حضور_الموظفين_${selectedDate}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-cairo" dir="rtl">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/staff" className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm border border-slate-100">
              <FaArrowLeft />
            </Link>
            <div>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">HR · Attendance</span>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900">سجل <span className="text-blue-600">الحضور والانصراف</span></h1>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto flex-wrap">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 h-11">
              <FaCalendarAlt className="text-slate-400" size={12} />
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="text-xs font-black text-slate-700 outline-none bg-transparent" />
            </div>
            <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 h-11 text-xs font-black text-slate-700 outline-none appearance-none">
              <option value="">كل الموظفين</option>
              {staffList.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <button onClick={fetchAttendance} className="w-11 h-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all">
              <FaSync size={12} />
            </button>
            <button onClick={exportToExcel} className="h-11 px-5 bg-slate-900 text-white rounded-xl text-xs font-black flex items-center gap-2 hover:bg-black transition-all">
              <FaDownload size={12} /> Excel
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'إجمالي الحاضرين', value: stats.present, icon: <FaUsers />, color: 'blue' },
            { label: 'سجّلوا الانصراف', value: stats.left, icon: <FaCheckCircle />, color: 'emerald' },
            { label: 'متوسط ساعات العمل', value: `${stats.avgHours}س`, icon: <FaUserClock />, color: 'violet' },
            { label: 'سجلات معدّلة', value: stats.modified, icon: <FaEdit />, color: 'amber' },
          ].map(s => (
            <div key={s.label} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className={`w-11 h-11 rounded-2xl bg-${s.color}-50 text-${s.color}-600 flex items-center justify-center text-lg flex-shrink-0`}>
                {s.icon}
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                <h3 className="text-xl font-black text-slate-900">{s.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest text-right">
                  <th className="p-5">الموظف</th>
                  <th className="p-5 text-center">حضور</th>
                  <th className="p-5 text-center">انصراف</th>
                  <th className="p-5 text-center">مدة العمل</th>
                  <th className="p-5 text-center">الحالة</th>
                  <th className="p-5 text-center">الموقع</th>
                  <th className="p-5 text-center">تعديل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="p-5"><div className="h-8 bg-slate-50 rounded-xl" /></td>
                      ))}
                    </tr>
                  ))
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-20 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-30">
                        <FaUserClock size={48} />
                        <p className="font-black text-slate-500">لا توجد سجلات لهذا اليوم</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredRecords.map(r => (
                  <tr key={r.id} className={`hover:bg-slate-50/50 transition-colors group ${r.is_modified ? 'bg-amber-50/30' : ''}`}>
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg flex-shrink-0">
                          {r.staff_name?.[0] || '?'}
                        </div>
                        <div>
                          <p className="font-black text-sm text-slate-800">{r.staff_name || 'غير معروف'}</p>
                          {r.device_info && (
                            <p className="text-[9px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                              <FaDesktop size={8} />
                              {r.device_info.includes('Mobile') ? 'موبايل' : 'كمبيوتر'}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-center font-black text-emerald-600 text-sm">{formatTime(r.check_in)}</td>
                    <td className="p-5 text-center">
                      <span className={`font-black text-sm ${r.check_out ? 'text-blue-600' : 'text-slate-300'}`}>
                        {formatTime(r.check_out)}
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[10px] font-black">
                        {getDuration(r.duration_minutes)}
                      </span>
                    </td>
                    <td className="p-5 text-center">{getStatusBadge(r)}</td>
                    <td className="p-5 text-center">
                      {r.latitude ? (
                        <a href={`https://maps.google.com/?q=${r.latitude},${r.longitude}`} target="_blank" rel="noreferrer"
                          className="text-blue-500 hover:text-blue-700 flex items-center justify-center gap-1 text-[10px] font-black">
                          <FaMapMarkerAlt size={10} /> عرض
                        </a>
                      ) : (
                        <span className="text-slate-300 text-[10px] font-bold">---</span>
                      )}
                    </td>
                    <td className="p-5 text-center">
                      <button onClick={() => handleOpenEdit(r)}
                        className="w-9 h-9 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl flex items-center justify-center transition-all mx-auto border border-slate-100">
                        <FaEdit size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Manual Override Modal ── */}
      {editModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Admin Override</p>
                <h3 className="text-xl font-black text-slate-900">تعديل سجل الحضور</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">{editModal.staff_name}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 flex items-center justify-center">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">وقت الحضور</label>
                <input type="datetime-local" value={editCheckIn} onChange={e => setEditCheckIn(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 rounded-2xl text-sm font-black text-slate-700 outline-none border-2 border-transparent focus:border-blue-500 transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">وقت الانصراف</label>
                <input type="datetime-local" value={editCheckOut} onChange={e => setEditCheckOut(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 rounded-2xl text-sm font-black text-slate-700 outline-none border-2 border-transparent focus:border-blue-500 transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">سبب التعديل <span className="text-red-500">*</span></label>
                <textarea value={editReason} onChange={e => setEditReason(e.target.value)}
                  placeholder="مثال: نسي الموظف تسجيل الانصراف، عطل في الجهاز..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold text-slate-700 outline-none border-2 border-transparent focus:border-amber-400 transition-all resize-none" />
              </div>

              {editModal.is_modified && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-amber-700 uppercase mb-1">آخر تعديل</p>
                  <p className="text-xs text-amber-600 font-bold">{editModal.modification_reason}</p>
                  <p className="text-[9px] text-amber-400 font-bold mt-1">{editModal.modified_at ? new Date(editModal.modified_at).toLocaleString('ar-EG') : ''}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={handleSaveEdit} disabled={editLoading}
                  className="flex-1 h-14 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all active:scale-95 disabled:opacity-50">
                  {editLoading ? 'جاري الحفظ...' : 'حفظ التعديل ✅'}
                </button>
                <button onClick={() => setEditModal(null)}
                  className="flex-1 h-14 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        .font-cairo { font-family: 'Cairo', sans-serif; }
      `}</style>
    </div>
  );
}
