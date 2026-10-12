import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

import { routes } from './routes';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ThemeProvider>
          <Router>
            <IntersectObserver />
            <div className="flex min-h-screen w-full flex-col">
              <main className="flex-grow">
                <Routes>
                  {routes.map((route, index) => (
                    <Route
                      key={index}
                      path={route.path}
                      element={route.element}
                    />
                  ))}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
            <Toaster />
          </Router>
        </ThemeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;
