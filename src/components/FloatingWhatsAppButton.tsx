import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateWhatsAppUrl } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface FloatingWhatsAppButtonProps {
  className?: string;
}

export default function FloatingWhatsAppButton({ className }: FloatingWhatsAppButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  
  // Show button after a small delay for better UX
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // LÓGICA SUPER SIMPLES: Mostrar apenas se usuário autenticado E em páginas internas
  const isAuthenticatedUser = !authLoading && user;
  const isDashboardPage = location.pathname.startsWith('/dashboard');
  const isAdminPage = location.pathname.startsWith('/admin');
  const isInternalPage = isDashboardPage || isAdminPage;
  
  // Páginas onde NÃO deve aparecer
  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register';
  const isPublicStorefront = location.pathname.match(/^\/[^\/]+$/) && !location.pathname.startsWith('/dashboard') && !location.pathname.startsWith('/admin');
  const isProductPage = location.pathname.match(/^\/[^\/]+\/produtos\/[^\/]+$/);
  
  const shouldHide = isLoginPage || isRegisterPage || isPublicStorefront || isProductPage;
  
  // MOSTRAR: usuário autenticado + página interna + não é página proibida + visível
  const shouldShow = isVisible && isAuthenticatedUser && isInternalPage && !shouldHide;
  
  console.log('🟢 FloatingWhatsAppButton SIMPLE DEBUG:', {
    pathname: location.pathname,
    isVisible,
    authLoading,
    userAuthenticated: !!user,
    isDashboardPage,
    isAdminPage,
    isInternalPage,
    shouldHide,
    shouldShow,
    finalDecision: shouldShow ? 'SHOW BUTTON' : 'HIDE BUTTON'
  });

  // Se não deve mostrar, não renderiza nada
  if (!shouldShow) {
    return null;
  }

  const whatsappNumber = '5591982465495'; // Número com código do país
  const defaultMessage = 'Olá! Gostaria de saber mais sobre o VitrineTurbo.';
  const whatsappUrl = generateWhatsAppUrl(whatsappNumber, defaultMessage);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        duration: 0.5,
        type: "spring",
        stiffness: 300,
        damping: 25
      }}
      className={`fixed bottom-6 right-6 z-50 ${className}`}
    >
      <Button
        size="sm"
        className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group bg-primary hover:bg-primary/90"
        asChild
      >
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar no WhatsApp - Suporte VitrineTurbo"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          >
            <MessageCircle className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
          </motion.div>
        </a>
      </Button>

      {/* Pulse animation ring */}
      <motion.div
        animate={{ 
          scale: [1, 1.4, 1],
          opacity: [0.7, 0, 0.7]
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute inset-0 rounded-full bg-primary -z-10"
      />
    </motion.div>
  );
}