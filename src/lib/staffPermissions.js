import { supabase } from './supabase';

/**
 * Check if a staff member has permission to access a specific page
 * @param {string} staffId - The staff member's ID
 * @param {string} permissionKey - The permission key to check (e.g., 'page_students')
 * @param {string} centerId - The center ID
 * @returns {Promise<boolean>} - Whether the staff member has permission
 */
export async function hasStaffPagePermission(staffId, permissionKey, centerId) {
  if (!staffId || !permissionKey || !centerId) {
    console.warn('Missing required parameters for permission check');
    return false;
  }

  try {
    // First check if user is admin or super_admin
    const { data: profile, error: profileError } = await supabase
      .from('staff_profiles')
      .select('role')
      .eq('id', staffId)
      .eq('center_id', centerId)
      .single();

    if (profileError) {
      console.error('Error checking user profile:', profileError);
    }

    // Admin and Super Admin have full access
    if (profile?.role === 'admin' || profile?.role === 'super_admin') {
      return true;
    }

    // For regular staff, check specific permissions
    const { data, error } = await supabase
      .from('staff_permissions')
      .select('permission_key')
      .eq('staff_id', staffId)
      .eq('center_id', centerId)
      .eq('permission_key', permissionKey)
      .single();

    if (error) {
      // If no permission found, return false (no access)
      if (error.code === 'PGRST116') {
        return false;
      }
      console.error('Error checking permission:', error);
      return false;
    }

    return !!data; // Return true if permission exists
  } catch (error) {
    console.error('Unexpected error checking permission:', error);
    return false;
  }
}

/**
 * Get all page permissions for a staff member
 * @param {string} staffId - The staff member's ID
 * @param {string} centerId - The center ID
 * @returns {Promise<string[]>} - Array of permission keys the staff member has
 */
export async function getStaffPagePermissions(staffId, centerId) {
  if (!staffId || !centerId) {
    console.warn('Missing required parameters for permissions fetch');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('staff_permissions')
      .select('permission_key')
      .eq('staff_id', staffId)
      .eq('center_id', centerId)
      .eq('permission_key', 'like', 'page_%'); // Only get page permissions

    if (error) {
      console.error('Error fetching staff permissions:', error);
      return [];
    }

    return data?.map(p => p.permission_key) || [];
  } catch (error) {
    console.error('Unexpected error fetching permissions:', error);
    return [];
  }
}

/**
 * Check if a staff member can access any of the specified pages
 * @param {string} staffId - The staff member's ID
 * @param {string[]} permissionKeys - Array of permission keys to check
 * @param {string} centerId - The center ID
 * @returns {Promise<boolean>} - Whether the staff member has any of the specified permissions
 */
export async function hasAnyStaffPagePermission(staffId, permissionKeys, centerId) {
  if (!Array.isArray(permissionKeys) || permissionKeys.length === 0) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('staff_permissions')
      .select('permission_key')
      .eq('staff_id', staffId)
      .eq('center_id', centerId)
      .in('permission_key', permissionKeys);

    if (error) {
      console.error('Error checking multiple permissions:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Unexpected error checking multiple permissions:', error);
    return false;
  }
}

/**
 * List of all admin page routes that can be controlled by permissions
 */
export const ADMIN_PAGE_PERMISSIONS = {
  '/admin/staff_dashboard': 'page_staff_dashboard',
  '/admin/sessions': 'page_sessions',
  '/admin/students': 'page_students',
  '/admin/instructors': 'page_instructors',
  '/admin/courses': 'page_courses',
  '/admin/groups': 'page_groups',
  '/admin/schedule': 'page_schedule',
  '/admin/finance/debts': 'page_finance_debts',
  '/admin/store': 'page_store',
  '/admin/finance/wallets': 'page_finance_wallets',
  '/admin/expenses': 'page_expenses',
  '/admin/notifications': 'page_notifications',
  '/admin/subscriptions': 'page_subscriptions',
  '/admin/lessons': 'page_lessons',
  '/admin/vouchers': 'page_vouchers',
  '/admin/support': 'page_support',
  '/admin/dashboard': 'page_admin_dashboard',
  '/admin/staff': 'page_staff',
  '/admin/settings': 'page_settings',
  '/admin/audit': 'page_audit'
};

/**
 * Get the permission key for a given route
 * @param {string} route - The admin route
 * @returns {string|null} - The corresponding permission key
 */
export function getPermissionForRoute(route) {
  return ADMIN_PAGE_PERMISSIONS[route] || null;
}
