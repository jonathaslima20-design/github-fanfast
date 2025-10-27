import { Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';

export default function PublicLayout() {
  const location = useLocation();
  
  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Only hide Footer on auth pages
  const hideFooter = ['/login', '/register', '/reset-password'].includes(location.pathname);

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <motion.main 
        className="flex-1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        key={location.pathname}
      >
        <Outlet />
      </motion.main>
      {!hideFooter && <Footer />}
    </div>
  );
}