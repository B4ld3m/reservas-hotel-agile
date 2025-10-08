import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CreditCard, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface Booking {
  id: string;
  total_amount: number;
  check_in: string;
  check_out: string;
  guests: number;
  rooms: {
    name: string;
  };
}

const paymentMethods = [
  { id: 'yape', name: 'Yape', icon: Smartphone, color: 'bg-purple-100 text-purple-800' },
  { id: 'plin', name: 'Plin', icon: Smartphone, color: 'bg-blue-100 text-blue-800' },
  { id: 'tarjeta_bcp', name: 'Tarjeta BCP', icon: CreditCard, color: 'bg-blue-100 text-blue-900' },
  { id: 'tarjeta_bbva', name: 'Tarjeta BBVA', icon: CreditCard, color: 'bg-sky-100 text-sky-900' },
  { id: 'tarjeta_interbank', name: 'Tarjeta Interbank', icon: CreditCard, color: 'bg-teal-100 text-teal-900' },
  { id: 'tarjeta_scotiabank', name: 'Tarjeta Scotiabank', icon: CreditCard, color: 'bg-red-100 text-red-900' },
];

export default function Payment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('yape');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Sesión expirada");
      navigate("/auth");
      return;
    }
    setUser(session.user);
  };

  const fetchBooking = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          rooms (name)
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      setBooking(data);
    } catch (error: any) {
      toast.error("Error al cargar la reserva");
      navigate("/bookings");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!user || !booking) return;

    setProcessing(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          booking_id: booking.id,
          user_id: user.id,
          amount: booking.total_amount,
          payment_method: selectedMethod as any,
          status: 'completado' as any,
          transaction_id: `TXN-${Date.now()}`,
        }])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update booking status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'confirmada' })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      // Call edge function to generate PDF and send email
      const { error: functionError } = await supabase.functions.invoke('generate-receipt', {
        body: { paymentId: payment.id },
      });

      if (functionError) console.error('Error generating receipt:', functionError);

      toast.success("¡Pago procesado exitosamente!");
      navigate("/bookings");
    } catch (error: any) {
      toast.error(error.message || "Error al procesar el pago");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold">Procesar Pago</h1>

          {/* Booking Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Reserva</CardTitle>
              <CardDescription>
                {booking.rooms.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entrada:</span>
                <span className="font-medium">
                  {new Date(booking.check_in).toLocaleDateString('es-PE')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Salida:</span>
                <span className="font-medium">
                  {new Date(booking.check_out).toLocaleDateString('es-PE')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Huéspedes:</span>
                <span className="font-medium">{booking.guests}</span>
              </div>
              <div className="flex justify-between pt-3 border-t text-lg font-bold">
                <span>Total a Pagar:</span>
                <span className="text-2xl text-accent">
                  S/ {booking.total_amount.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle>Método de Pago</CardTitle>
              <CardDescription>
                Selecciona tu método de pago preferido
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentMethods.map((method) => (
                    <Label
                      key={method.id}
                      htmlFor={method.id}
                      className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedMethod === method.id 
                          ? 'border-accent shadow-medium' 
                          : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <RadioGroupItem value={method.id} id={method.id} />
                      <div className={`p-2 rounded ${method.color}`}>
                        <method.icon className="h-5 w-5" />
                      </div>
                      <span className="font-medium">{method.name}</span>
                    </Label>
                  ))}
                </div>
              </RadioGroup>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Nota:</strong> Este es un sistema de pago simulado. En producción, 
                  se integraría con pasarelas de pago reales como Niubiz, Culqi o Mercado Pago.
                </p>
              </div>

              <Button
                onClick={handlePayment}
                disabled={processing}
                className="w-full mt-6"
                size="lg"
              >
                {processing ? "Procesando..." : `Pagar S/ ${booking.total_amount.toFixed(2)}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
