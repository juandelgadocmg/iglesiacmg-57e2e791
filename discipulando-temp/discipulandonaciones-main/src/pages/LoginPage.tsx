import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from 'sonner';
import logo from '@/assets/logo-discipulando.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        
        if (data.user) {
          // Create leader profile
          await supabase.from('leaders').insert({
            id: data.user.id,
            full_name: fullName || email,
            email,
          });
          // Assign LIDER role by default
          await supabase.from('user_roles').insert({
            user_id: data.user.id,
            role: 'LIDER',
          });
        }
        toast.success('Cuenta creada. Revisa tu correo para confirmar.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <img src={logo} alt="Discipulando Naciones CMG" className="h-28 mx-auto mb-2" />
          <h2 className="text-xl font-display font-bold text-foreground">
            {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Sistema de seguimiento de discipulado
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <Label htmlFor="fullName">Nombre completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Cargando...' : isSignUp ? 'Registrarse' : 'Entrar'}
            </Button>
          </form>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full mt-4 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
