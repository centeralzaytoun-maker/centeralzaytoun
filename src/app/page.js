'use client';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Hero } from '../components/landing/Hero';
import { Problem } from '../components/landing/Problem';
import { Features } from '../components/landing/Features';
import { Confidence } from '../components/landing/Confidence';
import { LiveTracking } from '../components/landing/LiveTracking';
import { SocialProof } from '../components/landing/SocialProof';
import { DeepDive } from '../components/landing/DeepDive';
import { Pricing } from '../components/landing/Pricing';
import { Portals } from '../components/landing/Portals';
import React from 'react';
import Link from 'next/link';
import { Facebook, MessageCircle } from 'lucide-react';

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <main className="bg-black min-h-screen text-white select-none selection:bg-blue-500/30 overflow-x-hidden">
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-blue-600 z-[100] origin-[0%]"
        style={{ scaleX }}
      />

      <Hero />
      <Problem />
      <Features />
      <Confidence />
      <LiveTracking />
      <SocialProof />
      <DeepDive />
      <Pricing />
      <Portals />

      {/* Final CTA Section */}
      <section className="py-24 bg-gradient-to-t from-blue-900/20 to-black text-center relative border-t border-white/5">
         <div className="max-w-4xl mx-auto px-4 relative z-10">
            <motion.h2 
               initial={{ opacity: 0, scale: 0.95 }}
               whileInView={{ opacity: 1, scale: 1 }}
               className="text-4xl md:text-6xl font-bold mb-6"
               dir="rtl"
            >
               جاهز تنقل سنترك للمستوى الجاي؟
            </motion.h2>
            <p className="text-xl text-neutral-400 mb-10" dir="rtl">انضم للنخبة وجرب Classora النهاردة.</p>
            <Link href="/admin-login" className="px-12 py-5 bg-blue-600 text-white text-xl font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-[0_0_50px_rgba(37,99,235,0.3)] inline-block">
               سجل الآن مجاناً
            </Link>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-black border-t border-white/5 text-neutral-400">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
             <div className="text-center md:text-right" dir="rtl">
                <h2 className="text-3xl font-bold text-white mb-2">Classora</h2>
                <p>سنترك الذكي - خيارك الأول لإدارة المستقبل</p>
             </div>
             
             <div className="flex gap-8 text-sm font-medium">
                <Link href="#" className="hover:text-blue-500 transition-colors">اتصل بنا</Link>
                <Link href="#" className="hover:text-blue-500 transition-colors">الأسعار</Link>
                <Link href="#" className="hover:text-blue-500 transition-colors">المميزات</Link>
                <Link href="#" className="hover:text-blue-500 transition-colors">الرئيسية</Link>
             </div>

             <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600/20 hover:text-blue-500 transition-all cursor-pointer">
                   <Facebook className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-green-600/20 hover:text-green-500 transition-all cursor-pointer">
                   <MessageCircle className="w-5 h-5" />
                </div>
             </div>
          </div>
          
          <div className="mt-20 pt-8 border-t border-white/5 text-center text-xs">
             <p>© {new Date().getFullYear()} Classora Inc. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}