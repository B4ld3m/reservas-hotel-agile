import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, CreditCard, FileText } from "lucide-react";
import { toast } from "sonner";

interface Booking {
  id: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_amount: number;
  status: string;
  created_at: string;
  rooms: {
    name: string;
    type: string;
  };
  payments?: Array<{
    id: string;
    status: string;
    payment_method: string;
    receipt_url?: string;
  }>;
}

export default function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Debes iniciar sesión");
      navigate("/auth");
      return;
    }
    setUser(session.user);
    fetchBookings(session.user.id);
  };

  const fetchBookings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          rooms (name, type),
          payments (id, status, payment_method, receipt_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      toast.error("Error al cargar las reservas");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pendiente: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
      confirmada: { label: 'Confirmada', className: 'bg-green-100 text-green-800' },
      cancelada: { label: 'Cancelada', className: 'bg-red-100 text-red-800' },
      completada: { label: 'Completada', className: 'bg-blue-100 text-blue-800' },
    };
    
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Mis Reservas</h1>
          <p className="text-muted-foreground">
            Gestiona todas tus reservas en Hotel Paraíso
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No tienes reservas</h3>
              <p className="text-muted-foreground mb-6">
                Explora nuestras habitaciones y haz tu primera reserva
              </p>
              <Button onClick={() => navigate("/rooms")}>
                Ver Habitaciones Disponibles
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id} className="hover:shadow-medium transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{booking.rooms.name}</CardTitle>
                      <CardDescription className="capitalize">
                        {booking.rooms.type}
                      </CardDescription>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Entrada</p>
                        <p className="font-medium">
                          {new Date(booking.check_in).toLocaleDateString('es-PE')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Salida</p>
                        <p className="font-medium">
                          {new Date(booking.check_out).toLocaleDateString('es-PE')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Huéspedes</p>
                        <p className="font-medium">{booking.guests}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-bold text-accent">
                          S/ {booking.total_amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {booking.status === 'pendiente' && (
                    <Button 
                      onClick={() => navigate(`/payment/${booking.id}`)}
                      className="w-full md:w-auto"
                    >
                      Completar Pago
                    </Button>
                  )}

                  {booking.payments && booking.payments.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Información de Pago:</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {booking.payments[0].payment_method.replace('_', ' ')}
                        </Badge>
                        <Badge className="bg-green-100 text-green-800">
                          {booking.payments[0].status === 'completado' ? 'Pagado' : 'Pendiente'}
                        </Badge>
                        {booking.payments[0].receipt_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(booking.payments[0].receipt_url, '_blank')}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Ver Comprobante
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
