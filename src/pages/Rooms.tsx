import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bed, Users, Sparkles, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Room {
  id: string;
  name: string;
  type: string;
  price_per_night: number;
  description: string;
  capacity: number;
  status: string;
  amenities: string[];
  image_url?: string;
}

export default function Rooms() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('status', 'disponible')
        .order('price_per_night', { ascending: true });

      if (error) throw error;
      setRooms(data || []);
    } catch (error: any) {
      toast.error("Error al cargar las habitaciones");
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = filterType === "all" 
    ? rooms 
    : rooms.filter(room => room.type === filterType);

  const handleBookRoom = (roomId: string) => {
    navigate(`/book/${roomId}`);
  };

  const getRoomTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      simple: "Simple",
      doble: "Doble",
      suite: "Suite",
      presidencial: "Presidencial"
    };
    return labels[type] || type;
  };

  const getRoomTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      simple: "bg-blue-100 text-blue-800",
      doble: "bg-green-100 text-green-800",
      suite: "bg-purple-100 text-purple-800",
      presidencial: "bg-yellow-100 text-yellow-800"
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8 space-y-4">
          <h1 className="text-4xl font-bold">Nuestras Habitaciones</h1>
          <p className="text-muted-foreground">
            Encuentra la habitación perfecta para tu estadía
          </p>
          
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium">Filtrar por tipo:</label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="simple">Simple</SelectItem>
                <SelectItem value="doble">Doble</SelectItem>
                <SelectItem value="suite">Suite</SelectItem>
                <SelectItem value="presidencial">Presidencial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted"></div>
                <CardHeader>
                  <div className="h-6 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
              <Card key={room.id} className="overflow-hidden hover:shadow-strong transition-all duration-300 hover:scale-105">
                <div className="h-48 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                  <Bed className="h-16 w-16 text-muted-foreground" />
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-xl">{room.name}</CardTitle>
                    <Badge className={getRoomTypeColor(room.type)}>
                      {getRoomTypeLabel(room.type)}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {room.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{room.capacity} personas</span>
                    </div>
                  </div>
                  {room.amenities && room.amenities.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Sparkles className="h-4 w-4" />
                        Amenidades:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {room.amenities.slice(0, 4).map((amenity, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {amenity}
                          </Badge>
                        ))}
                        {room.amenities.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{room.amenities.length - 4} más
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <p className="text-2xl font-bold text-accent">
                      S/ {room.price_per_night.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">por noche</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full shadow-soft hover:shadow-medium transition-all"
                    onClick={() => handleBookRoom(room.id)}
                  >
                    Reservar Ahora
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {!loading && filteredRooms.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No hay habitaciones disponibles con los filtros seleccionados
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
