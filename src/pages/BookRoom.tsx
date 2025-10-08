import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

interface Room {
  id: string;
  name: string;
  type: string;
  price_per_night: number;
  description: string;
  capacity: number;
}

interface AdditionalService {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
}

const bookingSchema = z.object({
  checkIn: z.string().min(1, "Selecciona fecha de entrada"),
  checkOut: z.string().min(1, "Selecciona fecha de salida"),
  guests: z.number().min(1, "Debe haber al menos 1 huésped"),
});

export default function BookRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [services, setServices] = useState<AdditionalService[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    checkIn: "",
    checkOut: "",
    guests: 1,
    specialRequests: "",
  });

  useEffect(() => {
    checkAuth();
    if (roomId) {
      fetchRoom();
      fetchServices();
    }
  }, [roomId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Debes iniciar sesión para reservar");
      navigate("/auth");
      return;
    }
    setUser(session.user);
  };

  const fetchRoom = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) throw error;
      setRoom(data);
    } catch (error: any) {
      toast.error("Error al cargar la habitación");
      navigate("/rooms");
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('additional_services')
        .select('*')
        .eq('active', true);

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      console.error("Error al cargar servicios:", error);
    }
  };

  const calculateTotal = () => {
    if (!room || !formData.checkIn || !formData.checkOut) return 0;
    
    const checkIn = new Date(formData.checkIn);
    const checkOut = new Date(formData.checkOut);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    let total = nights * room.price_per_night;
    
    selectedServices.forEach(serviceId => {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        total += service.price;
      }
    });
    
    return total;
  };

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !room) {
      toast.error("Error en la sesión");
      return;
    }

    try {
      const validatedData = bookingSchema.parse({
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        guests: formData.guests,
      });

      const checkIn = new Date(validatedData.checkIn);
      const checkOut = new Date(validatedData.checkOut);
      
      if (checkOut <= checkIn) {
        toast.error("La fecha de salida debe ser posterior a la fecha de entrada");
        return;
      }

      const total = calculateTotal();

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          room_id: room.id,
          check_in: validatedData.checkIn,
          check_out: validatedData.checkOut,
          guests: validatedData.guests,
          total_amount: total,
          special_requests: formData.specialRequests,
          status: 'pendiente',
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Add selected services
      if (selectedServices.length > 0) {
        const serviceRecords = selectedServices.map(serviceId => ({
          booking_id: booking.id,
          service_id: serviceId,
          quantity: 1,
        }));

        const { error: servicesError } = await supabase
          .from('booking_services')
          .insert(serviceRecords);

        if (servicesError) throw servicesError;
      }

      toast.success("Reserva creada exitosamente");
      navigate(`/payment/${booking.id}`);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Error al crear la reserva");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Reservar Habitación</h1>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Room Info */}
            <Card>
              <CardHeader>
                <CardTitle>{room.name}</CardTitle>
                <CardDescription>{room.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b">
                  <span className="text-muted-foreground">Precio por noche:</span>
                  <span className="text-2xl font-bold text-accent">
                    S/ {room.price_per_night.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Capacidad:</span>
                  <span className="font-medium">{room.capacity} personas</span>
                </div>
                <Badge className="capitalize">{room.type}</Badge>
              </CardContent>
            </Card>

            {/* Booking Form */}
            <Card>
              <CardHeader>
                <CardTitle>Detalles de la Reserva</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="checkIn">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        Fecha de Entrada
                      </Label>
                      <Input
                        id="checkIn"
                        type="date"
                        value={formData.checkIn}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkOut">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        Fecha de Salida
                      </Label>
                      <Input
                        id="checkOut"
                        type="date"
                        value={formData.checkOut}
                        min={formData.checkIn || new Date().toISOString().split('T')[0]}
                        onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guests">Número de Huéspedes</Label>
                    <Input
                      id="guests"
                      type="number"
                      min="1"
                      max={room.capacity}
                      value={formData.guests}
                      onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requests">Solicitudes Especiales (Opcional)</Label>
                    <Textarea
                      id="requests"
                      placeholder="Ej: Cama extra, vista específica, alergias alimentarias..."
                      value={formData.specialRequests}
                      onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="font-semibold mb-3">Servicios Adicionales</h3>
                    <div className="space-y-2">
                      {services.map((service) => (
                        <div key={service.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                          <Checkbox
                            id={service.id}
                            checked={selectedServices.includes(service.id)}
                            onCheckedChange={() => handleServiceToggle(service.id)}
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={service.id}
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              {service.name}
                            </label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {service.description}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-accent">
                            S/ {service.price.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {formData.checkIn && formData.checkOut && (
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-2xl text-accent">
                          S/ {calculateTotal().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full" size="lg">
                    Continuar al Pago
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
