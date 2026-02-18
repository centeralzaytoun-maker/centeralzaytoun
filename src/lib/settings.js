import { supabase } from './supabase-browser';

export const getCenterSettings = async (centerId) => {
  try {
    if (!centerId) {
      console.error('centerId is required for getCenterSettings');
      return {
        center_name: 'Smart Center',
        logo_url: null,
        primary_color: '#2563eb',
        description: 'مركزك التعليمي الأول'
      };
    }
    
    const { data, error } = await supabase
      .from('center_settings')
      .select('*')
      .eq('center_id', centerId) // ← فلترة حسب المركز
      .single();
    
    if (error) {
      console.error('Error fetching center settings:', error);
      return {
        center_name: 'Smart Center',
        logo_url: null,
        primary_color: '#2563eb',
        description: 'مركزك التعليمي الأول'
      };
    }
    
    return {
      name: data?.center_name || 'Smart Center',
      logo: data?.logo_url ? data.logo_url.split('/').pop().substring(0, 2).toUpperCase() : 'SC',
      logo_url: data?.logo_url || null,
      description: data?.address || 'مركزك التعليمي الأول',
      primary_color: data?.primary_color || '#2563eb',
      phone: data?.phone || '',
      address: data?.address || '',
      next_student_code: data?.next_student_code || 100000,
      student_code_prefix: data?.student_code_prefix || 'S'
    };
  } catch (error) {
    console.error('Error in getCenterSettings:', error);
    return {
      center_name: 'Smart Center',
      logo_url: null,
      primary_color: '#2563eb',
      description: 'مركزك التعليمي الأول'
    };
  }
};
