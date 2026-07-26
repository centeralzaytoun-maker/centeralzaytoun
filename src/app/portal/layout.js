'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaHome, FaEnvelope, FaUser, FaClock, FaFileAlt } from 'react-icons/fa';
import { useEffect, useState } from 'react';

export default function PortalLayout({ children }) {
  const pathname = usePathname();
  const [homeLink, setHomeLink] = useState('/portal/dashboard');
  const [isParent, setIsParent] = useState(false);

  useEffect(() => {
    // Check if it's a parent session
    const parentSession = localStorage.getItem('parent_student_code') || localStorage.getItem('parent_student_data');
    if (parentSession) {
      setHomeLink('/parent/login');
      setIsParent(true);
    }
  }, []);

  const NavItem = ({ href, icon, label }) => {
    const isActive = pathname === href;
    return (
      <Link href={href} className={`flex flex-col items-center gap-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
        <div className={`text-xl ${isActive ? 'scale-110' : ''} transition-transform`}>{icon}</div>
        <span className="text-[10px] font-bold">{label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {children}

      {/* شريط التنقل السفلي (موبايل أبلكيشن ستايل) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-6 py-3 flex justify-around items-center z-50 md:hidden shadow-[0_-10px_25px_rgba(0,0,0,0.05)] rounded-t-[2rem]">
        <NavItem href={homeLink} icon={<FaHome />} label={isParent ? "الرئيسية" : "الرئيسية"} />
        <NavItem href={isParent ? "/parent/login" : "/portal/inbox"} icon={<FaEnvelope />} label={isParent ? "الدعم" : "الرسائل"} />
        <NavItem href={isParent ? "/parent/login#schedule-section" : "/portal/dashboard#schedule"} icon={<FaClock />} label="الجدول" />
        <NavItem href={isParent ? "/parent/login#exams-section" : "/portal/dashboard#exams"} icon={<FaFileAlt />} label={isParent ? "الدرجات" : "درجاتي"} />
      </div>
    </div>
  );
}