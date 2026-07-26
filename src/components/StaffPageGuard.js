'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';

export default function StaffPageGuard({ children, requiredPermission = null }) {
  const router = useRouter();
  const { user, centerId, role, allowedFeatures } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function checkPermission() {
      console.log('🔍 StaffPageGuard Debug - Checking permissions:', {
        userId: user?.id,
        centerId,
        role,
        requiredPermission,
        allowedFeatures
      });

      if (!user || !centerId) {
        console.log('❌ StaffPageGuard - No user or centerId');
        setIsLoading(false);
        return;
      }

      // Super admin has access to everything
      if (role === 'super_admin') {
        console.log('✅ StaffPageGuard - Super Admin access granted');
        setHasPermission(true);
        setIsLoading(false);
        return;
      }

      // Admin needs to check center features (controlled by Super Admin)
      if (role === 'admin') {
        console.log('🔍 StaffPageGuard - Checking Admin access for:', requiredPermission);
        // Admin can access pages based on center features only
        // This means Super Admin controls what Admin can see through package features
        if (allowedFeatures?.includes(requiredPermission)) {
          console.log('✅ StaffPageGuard - Admin access granted');
          setHasPermission(true);
        } else {
          console.log('❌ StaffPageGuard - Admin access denied - feature not in package');
          setError('هذه الصفحة غير مفعلة في باقتك الحالية');
          setTimeout(() => {
            router.push('/admin/dashboard');
          }, 3000);
        }
        setIsLoading(false);
        return;
      }

      // If no specific permission required, allow access (for pages that don't need permission checks)
      if (!requiredPermission) {
        console.log('✅ StaffPageGuard - No permission required, access granted');
        setHasPermission(true);
        setIsLoading(false);
        return;
      }

      try {
        console.log('🔍 StaffPageGuard - Checking staff permissions for:', requiredPermission);
        // Use API to check permissions instead of direct Supabase call
        const res = await fetch(`/api/staff-permissions?center_id=${centerId}`);
        if (res.ok) {
          const data = await res.json();
          const userPerms = data.staffPermissions
            .filter(p => p.staff_id === user.id)
            .map(p => p.permission_key);
          
          console.log('🔍 StaffPageGuard - User permissions:', userPerms);
          console.log('🔍 StaffPageGuard - Looking for:', requiredPermission);
          
          const hasPermission = userPerms.includes(requiredPermission);
          console.log('🔍 StaffPageGuard - Has permission:', hasPermission);
          
          setHasPermission(hasPermission);
          
          if (!hasPermission) {
            console.log('❌ StaffPageGuard - Staff access denied');
            setError('ليس لديك صلاحية للوصول إلى هذه الصفحة');
            // Redirect to staff dashboard after a delay
            setTimeout(() => {
              router.push('/admin/staff_dashboard');
            }, 3000);
          } else {
            console.log('✅ StaffPageGuard - Staff access granted');
          }
        } else {
          throw new Error('Failed to fetch permissions');
        }
      } catch (err) {
        console.error('Error checking permission:', err);
        setError('حدث خطأ أثناء التحقق من الصلاحيات');
      } finally {
        setIsLoading(false);
      }
    }

    checkPermission();
  }, [user, centerId, requiredPermission, router]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-transparent">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-blue-100/50 rounded-full mx-auto mb-6 flex items-center justify-center animate-pulse">
            <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
          </div>
          <p className="text-gray-400 font-black text-sm md:text-lg">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (error || !hasPermission) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-transparent">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 bg-amber-100 rounded-full mx-auto mb-6 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-amber-600" />
          </div>
          <h2 className="text-xl font-black text-gray-800 mb-4">الوصول ممنوع</h2>
          <p className="text-gray-400 text-sm font-bold mb-6">
            {error || 'ليس لديك صلاحية للوصول إلى هذه الصفحة. سيتم إعادة توجيهك إلى لوحة التحكم الرئيسية...'}
          </p>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <div className="flex items-center gap-3 text-amber-700">
              <Shield className="h-5 w-5" />
              <p className="text-xs font-black">
                إذا كنت تعتقد أن هذا خطأ، تواصل مع مدير النظام لمنحك الصلاحيات المناسبة
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
