// src/hooks/useExpenses.js
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase-browser';
import { useAuth } from '../context/AuthContext'; // ← استخدام الـ context للحصول على centerId

export const useExpenses = (initialMonth) => {
  const { centerId, user } = useAuth(); // ← استخراج centerId و user من الـ context
  
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  
  // 🆕 State جديد لرصيد الخزنة
  const [balanceInfo, setBalanceInfo] = useState({ income: 0, expenses: 0, balance: 0 });

  // 1. Fetch Expenses List Logic
  const fetchExpenses = useCallback(async () => {
    if (!centerId) return;
    
    setLoading(true);
    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(Number(year), Number(month), 0).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('center_id', centerId) // ← فلترة حسب المركز
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false });

    if (error) console.error('Error fetching expenses:', error);
    else setExpenses(data || []);
    
    setLoading(false);
  }, [selectedMonth, centerId]);

  // 2. 🆕 Fetch Live Balance Logic (من دالة SQL)
  const fetchBalance = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_financial_summary');
    if (!error && data) {
        setBalanceInfo(data);
    } else if (error) {
        console.error('Error fetching balance:', error);
    }
  }, []);

  // تشغيل الـ Fetch عند التحميل أو تغيير الشهر
  useEffect(() => {
    fetchExpenses();
    fetchBalance(); // 🆕 هات الرصيد أول ما تفتح
  }, [fetchExpenses, fetchBalance]);

  // 3. Add Logic
  const addExpense = async (newExpense, categoryLabel) => {
    if (!centerId) {
      throw new Error('لم يتم تحديد المركز! يرجى تسجيل الدخول مرة أخرى.');
    }
    
    const amountVal = parseFloat(newExpense.amount);
    
    const { data, error } = await supabase.from('expenses').insert([{
      ...newExpense,
      center_id: centerId,
      created_by: user?.id,
      staff_name: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'مدير',
      is_admin: true // Default to true when coming from useExpenses (Admin Page)
    }]).select();
    
    if (error) throw error;

    const addedExpense = data[0];

    // Audit Log (Implicit)
    await supabase.from('audit_logs').insert({
        table_name: 'expenses',
        record_id: addedExpense.id,
        action: 'DEBIT',
        staff_id: user?.id, // 🆕 تسجيل المسؤول عن العملية
        new_data: { 
            amount: amountVal,
            details: `تسجيل مصروف: ${newExpense.title} (${categoryLabel})`
        },
        center_id: centerId // ← إضافة center_id
    });

    // Optimistic Update
    setExpenses(prev => {
        const newList = [addedExpense, ...prev];
        return newList.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
    });

    fetchBalance(); // 🆕 تحديث الرصيد فوراً بعد الصرف
  };

  // 4. Delete Logic
  const deleteExpense = async (expense) => {
    if (!centerId) {
      throw new Error('لم يتم تحديد المركز! يرجى تسجيل الدخول مرة أخرى.');
    }
    
    // Audit Log before delete
    await supabase.from('audit_logs').insert({
        table_name: 'expenses',
        record_id: expense.id,
        action: 'DELETE',
        staff_id: user?.id, // 🆕 تسجيل المسؤول عن العملية
        old_data: expense,
        new_data: { details: `تم حذف مصروف: ${expense.title} بقيمة ${expense.amount}` },
        center_id: centerId // ← إضافة center_id
    });

    const { error } = await supabase.from('expenses').delete().eq('id', expense.id).eq('center_id', centerId);
    
    if (!error) {
        setExpenses(prev => prev.filter(x => x.id !== expense.id));
        fetchBalance(); // 🆕 تحديث الرصيد فوراً بعد الحذف (الفلوس "رجعت" نظرياً)
    } else {
        throw new Error("فشل الحذف");
    }
  };

  // 5. Calculations (Memoized)
  const totalExpenses = useMemo(() => 
    expenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)
  , [expenses]);

  const categoryTotals = useMemo(() => {
    return expenses.reduce((acc, curr) => {
        const cat = curr.category;
        const amount = parseFloat(curr.amount) || 0;
        acc[cat] = (acc[cat] || 0) + amount;
        return acc;
    }, {});
  }, [expenses]);

  return {
    expenses,
    loading,
    selectedMonth,
    setSelectedMonth,
    addExpense,
    deleteExpense,
    totalExpenses,
    categoryTotals,
    balanceInfo, // 🆕 تصدير الرصيد للصفحة
    fetchBalance // 🆕 تصدير دالة التحديث (لو حبينا نعمل زرار Refresh)
  };
};
