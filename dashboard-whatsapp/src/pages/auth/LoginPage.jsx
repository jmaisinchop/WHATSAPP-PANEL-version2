import { useState, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import particlesConfig from '../../config/particles-config';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../contexts/ThemeContext';
import { CustomLogo } from '../../components/auth/CustomLogo';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Moon, Sun, Smartphone, Mail, Lock, Eye, EyeOff, MessageCircle, Zap, ChevronRight } from 'lucide-react';

export default function LoginPage() {
  console.log("LA API URL QUE ESTÁ USANDO VITE ES:", import.meta.env.VITE_API_URL);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const particlesInit = useCallback(async (engine) => {
    await loadFull(engine);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Por favor, ingresa tu email y contraseña.');
      return;
    }
    const loadingToast = toast.loading('Conectando a KIKA...');
    const { success, message } = await login(email, password);
    toast.dismiss(loadingToast);

    if (success) {
      toast.success('¡Conexión exitosa con KIKA!');
      navigate('/dashboard');
    } else {
      toast.error(message || 'Credenciales incorrectas.');
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  // WhatsApp inspired colors
  const whatsappColors = {
    primary: '#194d74',       // WhatsApp dark blue
    secondary: '#4a84bd',     // WhatsApp medium blue
    light: '#92aed8',         // WhatsApp light blue
    background: '#d6dae3',    // Light gray background
    dark: '#313130',          // Dark text
    gray: '#7e8084',          // Medium gray
    lightGray: '#9d9c9c',     // Light gray
    accent: '#4e6f8d'         // Complementary blue-gray
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden"
      style={{
        background: theme === 'dark'
          ? `linear-gradient(135deg, ${whatsappColors.dark} 0%, #1a2e3b 100%)`
          : `linear-gradient(135deg, ${whatsappColors.background} 0%, ${whatsappColors.light} 100%)`
      }}>

      <Toaster position="top-right" toastOptions={{
        style: {
          borderRadius: '12px',
          background: theme === 'dark' ? whatsappColors.dark : '#fff',
          color: theme === 'dark' ? '#fff' : whatsappColors.dark,
          border: `1px solid ${theme === 'dark' ? whatsappColors.accent : whatsappColors.light}`
        }
      }} />

      {/* Partículas interactivas con colores WhatsApp */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          ...particlesConfig,
          particles: {
            ...particlesConfig.particles,
            color: {
              value: theme === 'dark' ? whatsappColors.secondary : whatsappColors.primary
            }
          },
          interactivity: {
            events: {
              onHover: {
                enable: true,
                mode: "bubble",
              },
            },
            modes: {
              bubble: {
                distance: 100,
                size: 10,
                duration: 2,
                opacity: 0.8,
                color: whatsappColors.secondary
              }
            }
          }
        }}
        className="absolute inset-0 -z-0"
      />

      {/* Layout principal */}
      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        {/* Sección de branding - Izquierda */}
        <div
          className="hidden lg:flex flex-col items-center justify-center p-12"
          style={{
            background: theme === 'dark'
              ? `linear-gradient(135deg, ${whatsappColors.primary} 0%, ${whatsappColors.accent} 100%)`
              : `linear-gradient(135deg, ${whatsappColors.light} 0%, ${whatsappColors.secondary} 100%)`
          }}
        >
          <div
            className="text-center space-y-6 transition-all duration-500"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="relative">
              <div className="relative flex justify-center">
                <MessageCircle
                  className={`h-32 w-32 mx-auto ${isHovered ? 'animate-bounce' : ''}`}
                  style={{ color: theme === 'dark' ? whatsappColors.background : '#fff' }}
                />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <Zap
                    className={`h-16 w-16 ${isHovered ? 'animate-pulse' : ''}`}
                    style={{ color: theme === 'dark' ? '#25D366' : '#25D366' }}
                  />
                </div>
              </div>
              {isHovered && (
                <div className="absolute -top-2 -right-2">
                  <ChevronRight className="h-8 w-8" style={{ color: theme === 'dark' ? whatsappColors.background : '#fff' }} />
                </div>
              )}
            </div>
            <h1
              className="text-6xl font-bold"
              style={{
                color: theme === 'dark' ? whatsappColors.background : '#fff',
                textShadow: `0 2px 4px rgba(0,0,0,0.2)`
              }}
            >
              KIKA
            </h1>
            <p
              className="text-xl font-medium"
              style={{
                color: theme === 'dark' ? `${whatsappColors.background}90` : '#ffffff90'
              }}
            >
              Tu asistente inteligente de WhatsApp
            </p>
            <div
              className="flex justify-center items-center gap-2 pt-4 p-3 rounded-lg"
              style={{
                background: theme === 'dark' ? `${whatsappColors.background}20` : '#ffffff20'
              }}
            >
              <Smartphone className="h-6 w-6" style={{ color: theme === 'dark' ? whatsappColors.background : '#fff' }} />
              <span style={{ color: theme === 'dark' ? whatsappColors.background : '#fff' }}>+593995514999</span>
            </div>
          </div>
        </div>

        {/* Sección de formulario - Derecha */}
        <div className="flex items-center justify-center p-6 lg:p-8">
          <div className="w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-500">
            <Card
              className="relative overflow-hidden border-none shadow-xl hover:shadow-2xl transition-shadow duration-300"
              style={{
                background: theme === 'dark'
                  ? `${whatsappColors.dark}dd`
                  : `${whatsappColors.background}dd`,
                backdropFilter: 'blur(16px)'
              }}
            >
              {/* Efecto de acento */}
              <div
                className="absolute -top-20 -right-20 h-40 w-40 rounded-full blur-xl"
                style={{ background: whatsappColors.secondary }}
              ></div>

              {/* Toggle de tema */}
              <div className="absolute top-4 right-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  style={{
                    background: theme === 'dark'
                      ? `${whatsappColors.background}20`
                      : `${whatsappColors.primary}10`,
                    color: theme === 'dark' ? whatsappColors.background : whatsappColors.primary
                  }}
                >
                  <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
              </div>

              <CardHeader className="text-center pt-12 space-y-1">
                <CardTitle
                  className="text-3xl font-bold"
                  style={{ color: theme === 'dark' ? whatsappColors.background : whatsappColors.primary }}
                >
                  Conéctate a KIKA
                </CardTitle>
                <CardDescription
                  style={{
                    color: theme === 'dark' ? `${whatsappColors.background}80` : `${whatsappColors.primary}80`
                  }}
                >
                  Administra tu bot de WhatsApp
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="flex items-center gap-2" style={{ color: theme === 'dark' ? whatsappColors.background : whatsappColors.primary }}>
                      <Mail className="h-4 w-4" />
                      <span>Correo electrónico</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder="tu@correo.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 pl-10"
                        style={{
                          background: theme === 'dark'
                            ? `${whatsappColors.dark}90`
                            : `${whatsappColors.background}90`,
                          borderColor: theme === 'dark'
                            ? whatsappColors.accent
                            : whatsappColors.lightGray,
                          color: theme === 'dark' ? whatsappColors.background : whatsappColors.dark
                        }}
                      />
                      <Mail
                        className="absolute left-3 top-3.5 h-5 w-5"
                        style={{ color: theme === 'dark' ? whatsappColors.background : whatsappColors.gray }}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="password" className="flex items-center gap-2" style={{ color: theme === 'dark' ? whatsappColors.background : whatsappColors.primary }}>
                      <Lock className="h-4 w-4" />
                      <span>Contraseña</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 pl-10"
                        style={{
                          background: theme === 'dark'
                            ? `${whatsappColors.dark}90`
                            : `${whatsappColors.background}90`,
                          borderColor: theme === 'dark'
                            ? whatsappColors.accent
                            : whatsappColors.lightGray,
                          color: theme === 'dark' ? whatsappColors.background : whatsappColors.dark
                        }}
                      />
                      <Lock
                        className="absolute left-3 top-3.5 h-5 w-5"
                        style={{ color: theme === 'dark' ? whatsappColors.background : whatsappColors.gray }}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-3.5"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ color: theme === 'dark' ? whatsappColors.background : whatsappColors.gray }}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full text-lg h-12 mt-2 transition-all shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${whatsappColors.primary} 0%, ${whatsappColors.secondary} 100%)`,
                      color: '#fff',
                      border: 'none'
                    }}
                  >
                    Conectar con WhatsApp
                  </Button>
                </form>

                <div
                  className="mt-6 text-center text-sm"
                  style={{ color: theme === 'dark' ? `${whatsappColors.background}70` : `${whatsappColors.primary}70` }}
                >
                  <p>¿No tienes acceso? <a href="#" style={{ color: whatsappColors.secondary }} className="hover:underline">Contacta al administrador</a></p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}