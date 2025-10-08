import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Star, Wifi, UtensilsCrossed, Car, Dumbbell, Sparkles } from "lucide-react";
import heroImage from "@/assets/hotel-hero.jpg";

export default function Home() {
  const features = [
    { icon: Wifi, title: "WiFi Gratis", description: "Internet de alta velocidad en todo el hotel" },
    { icon: UtensilsCrossed, title: "Restaurante", description: "Cocina gourmet internacional y local" },
    { icon: Car, title: "Estacionamiento", description: "Estacionamiento privado y seguro" },
    { icon: Dumbbell, title: "Gimnasio", description: "Equipamiento moderno 24/7" },
    { icon: Sparkles, title: "Spa", description: "Tratamientos de lujo y relajación" },
    { icon: Star, title: "5 Estrellas", description: "Servicio premium garantizado" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden mt-16">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Hotel Paraíso Lobby" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-overlay"></div>
        </div>
        
        <div className="relative z-10 text-center text-white px-4 space-y-6 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Hotel Paraíso
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
            Experiencia de lujo incomparable en el corazón de la ciudad
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link to="/rooms">
              <Button size="lg" className="shadow-gold hover:scale-105 transition-transform">
                Explorar Habitaciones
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20">
                Reservar Ahora
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">Amenidades Premium</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Disfruta de servicios de clase mundial diseñados para tu comodidad
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-border/50 hover:shadow-medium transition-all hover:scale-105 duration-300">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-gradient-gold flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-primary text-white">
        <div className="container mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            ¿Listo para una Experiencia Inolvidable?
          </h2>
          <p className="text-white/90 max-w-2xl mx-auto text-lg">
            Reserva ahora y disfruta de tarifas especiales en nuestras habitaciones de lujo
          </p>
          <Link to="/rooms">
            <Button size="lg" variant="secondary" className="shadow-gold hover:scale-105 transition-transform">
              Ver Habitaciones Disponibles
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-8 px-4">
        <div className="container mx-auto text-center">
          <p className="text-sm opacity-80">
            © 2025 Hotel Paraíso. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
