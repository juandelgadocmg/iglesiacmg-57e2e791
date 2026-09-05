import { useSearchParams } from "react-router-dom";
import logo from "@/assets/logo.jpeg";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight, KeyRound, ArrowLeft, UserPlus, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { lovable } from "@/integrations/lovable/index";
import { Separator } from "@/components/ui/separator";

type ViewMode = "login" | "signup" | "forgot";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [view, setView] = useState<ViewMode>("login");
  const navigate = useNavigate();
  const { session } = useAuth();
  const [searchParams] = useSearchParams();

  // Same-origin relative path only, to preserve OAuth consent flows.
  const rawNext = searchParams.get("next") ?? "";
  const nextPath =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "";
  const postAuthTarget = nextPath || "/hoy";
  const postAuthAbsolute = `${window.location.origin}${postAuthTarget}`;

  if (session) return <Navigate to={postAuthTarget} replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (view === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        if (/rate limit|too many/i.test(error.message)) {
          toast.error("Límite de solicitudes por hora alcanzado. Si no recibes el correo, solicita a un administrador que restablezca tu contraseña.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Se envió el enlace de recuperación a su correo. Por favor revise su bandeja de entrada y Spam.");
      }
      setLoading(false);
      return;
    }

    if (view === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: postAuthAbsolute },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Cuenta creada. Revise su correo para confirmar.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error("Credenciales incorrectas");
      } else {
        navigate(postAuthTarget);
      }
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: postAuthAbsolute,
    });
    if (error) {
      toast.error("Error al iniciar sesión con Google");
      setGoogleLoading(false);
    }
  };

  const titles: Record<ViewMode, string> = {
    login: "Bienvenido de vuelta",
    signup: "Crear Cuenta",
    forgot: "Recuperar Contraseña",
  };

  const subtitles: Record<ViewMode, string> = {
    login: "Ingrese sus credenciales para acceder al sistema",
    signup: "Complete los datos para registrarse",
    forgot: "Ingrese su correo y le enviaremos un enlace para restablecer su contraseña",
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex flex-1 sidebar-gradient items-center justify-center p-12 relative overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--sidebar-primary)) 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center relative z-10"
        >
          <div className="relative inline-block mb-8">
            <div className="absolute -inset-3 rounded-3xl gold-gradient opacity-20 blur-xl" />
            <img src={logo} alt="CMG" className="w-28 h-28 rounded-2xl relative shadow-2xl" />
          </div>
          <h1 className="text-4xl font-bold text-sidebar-primary-foreground mb-3 tracking-tight">
            CMG Admin
          </h1>
          <p className="text-sidebar-foreground/70 text-sm max-w-xs leading-relaxed">
            Plataforma integral de gestión pastoral, afirmación y consolidación de la Iglesia Cristiana CMG.
          </p>
          <div className="mt-10 flex items-center gap-3 justify-center text-sidebar-foreground/40 text-xs">
            <span className="w-8 h-px bg-sidebar-foreground/20" />
            Gestión · Finanzas · Ministerios
            <span className="w-8 h-px bg-sidebar-foreground/20" />
          </div>
        </motion.div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="relative">
              <div className="absolute -inset-2 rounded-2xl gold-gradient opacity-20 blur-lg" />
              <img src={logo} alt="CMG" className="w-16 h-16 rounded-xl relative" />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-bold mb-1 text-foreground tracking-tight">
                {titles[view]}
              </h2>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                {subtitles[view]}
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Correo electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="admin@cmg.church"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                {/* Password (hidden on forgot) */}
                {view !== "forgot" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Contraseña</label>
                      {view === "login" && (
                        <button
                          type="button"
                          onClick={() => setView("forgot")}
                          className="text-xs text-accent hover:underline font-medium"
                        >
                          ¿Olvidó su contraseña?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="pl-10 h-11"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Procesando…
                    </span>
                  ) : view === "login" ? (
                    <>Ingresar <LogIn className="h-4 w-4" /></>
                  ) : view === "signup" ? (
                    <>Registrarse <UserPlus className="h-4 w-4" /></>
                  ) : (
                    <>Enviar enlace <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              </form>

              {view !== "forgot" && (
                <>
                  <div className="flex items-center gap-3 my-5">
                    <Separator className="flex-1" />
                    <span className="text-xs text-muted-foreground">o continuar con</span>
                    <Separator className="flex-1" />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 gap-2 font-medium"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                  >
                    {googleLoading ? (
                      <span className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                    ) : (
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    )}
                    Google
                  </Button>
                </>
              )}

              {/* Footer links */}
              <div className="mt-6 text-center text-sm text-muted-foreground">
                {view === "login" && (
                  <p>
                    ¿No tiene cuenta?{" "}
                    <button onClick={() => setView("signup")} className="text-accent hover:underline font-medium">
                      Registrarse
                    </button>
                  </p>
                )}
                {view === "signup" && (
                  <p>
                    ¿Ya tiene cuenta?{" "}
                    <button onClick={() => setView("login")} className="text-accent hover:underline font-medium">
                      Iniciar sesión
                    </button>
                  </p>
                )}
                {view === "forgot" && (
                  <button
                    onClick={() => setView("login")}
                    className="inline-flex items-center gap-1 text-accent hover:underline font-medium"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Volver a iniciar sesión
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <p className="text-center text-xs text-muted-foreground mt-10">
            © 2026 Centro Mundial de Gloria · CMG Admin
          </p>
        </motion.div>
      </div>
    </div>
  );
}
