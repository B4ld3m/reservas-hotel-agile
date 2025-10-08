-- Crear tabla de perfiles de usuario
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  dni TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, dni, address)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'dni', ''),
    COALESCE(new.raw_user_meta_data->>'address', '')
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Crear enum para roles
CREATE TYPE public.app_role AS ENUM ('client', 'receptionist', 'admin');

-- Tabla de roles de usuario
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'client',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Habilitar RLS en user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Función para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Políticas RLS para user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'receptionist'));

-- Trigger para asignar rol de cliente por defecto
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'client');
  RETURN new;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Enum para tipo de habitación
CREATE TYPE public.room_type AS ENUM ('simple', 'doble', 'suite', 'presidencial');

-- Enum para estado de habitación
CREATE TYPE public.room_status AS ENUM ('disponible', 'ocupada', 'mantenimiento');

-- Tabla de habitaciones
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type room_type NOT NULL,
  price_per_night DECIMAL(10,2) NOT NULL,
  description TEXT,
  capacity INTEGER NOT NULL DEFAULT 2,
  image_url TEXT,
  status room_status NOT NULL DEFAULT 'disponible',
  amenities TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para rooms
CREATE POLICY "Anyone can view available rooms"
  ON public.rooms FOR SELECT
  USING (true);

CREATE POLICY "Receptionists can manage rooms"
  ON public.rooms FOR ALL
  USING (public.has_role(auth.uid(), 'receptionist') OR public.has_role(auth.uid(), 'admin'));

-- Tabla de servicios adicionales
CREATE TABLE public.additional_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  icon TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en additional_services
ALTER TABLE public.additional_services ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para additional_services
CREATE POLICY "Anyone can view active services"
  ON public.additional_services FOR SELECT
  USING (active = true);

CREATE POLICY "Receptionists can manage services"
  ON public.additional_services FOR ALL
  USING (public.has_role(auth.uid(), 'receptionist') OR public.has_role(auth.uid(), 'admin'));

-- Enum para estado de reserva
CREATE TYPE public.booking_status AS ENUM ('pendiente', 'confirmada', 'cancelada', 'completada');

-- Tabla de reservas
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INTEGER NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status booking_status NOT NULL DEFAULT 'pendiente',
  special_requests TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para bookings
CREATE POLICY "Users can view their own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Receptionists can view all bookings"
  ON public.bookings FOR SELECT
  USING (public.has_role(auth.uid(), 'receptionist') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Receptionists can update all bookings"
  ON public.bookings FOR UPDATE
  USING (public.has_role(auth.uid(), 'receptionist') OR public.has_role(auth.uid(), 'admin'));

-- Tabla de relación reservas-servicios
CREATE TABLE public.booking_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.additional_services(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(booking_id, service_id)
);

-- Habilitar RLS en booking_services
ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para booking_services
CREATE POLICY "Users can view services for their bookings"
  ON public.booking_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_services.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add services to their bookings"
  ON public.booking_services FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_services.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Receptionists can manage all booking services"
  ON public.booking_services FOR ALL
  USING (public.has_role(auth.uid(), 'receptionist') OR public.has_role(auth.uid(), 'admin'));

-- Enum para método de pago
CREATE TYPE public.payment_method AS ENUM ('yape', 'plin', 'tarjeta_bcp', 'tarjeta_bbva', 'tarjeta_interbank', 'tarjeta_scotiabank');

-- Enum para estado de pago
CREATE TYPE public.payment_status AS ENUM ('pendiente', 'completado', 'fallido', 'reembolsado');

-- Tabla de pagos
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'pendiente',
  transaction_id TEXT,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para payments
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Receptionists can view all payments"
  ON public.payments FOR SELECT
  USING (public.has_role(auth.uid(), 'receptionist') OR public.has_role(auth.uid(), 'admin'));

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers para updated_at
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar servicios adicionales por defecto
INSERT INTO public.additional_services (name, description, price, icon) VALUES
('Desayuno Buffet', 'Buffet completo de desayuno con opciones locales e internacionales', 35.00, 'UtensilsCrossed'),
('Transporte al Aeropuerto', 'Servicio de transporte privado hacia/desde el aeropuerto', 80.00, 'Plane'),
('Spa y Masajes', 'Sesión de spa con masaje relajante de 60 minutos', 150.00, 'Sparkles'),
('Late Check-out', 'Extensión de horario de salida hasta las 18:00', 50.00, 'Clock'),
('Cena Romántica', 'Cena privada para dos personas con vista panorámica', 200.00, 'Heart'),
('Tour Guiado', 'Tour guiado por la ciudad con guía profesional', 120.00, 'Map');

-- Insertar habitaciones de ejemplo
INSERT INTO public.rooms (name, type, price_per_night, description, capacity, status, amenities) VALUES
('Suite Presidencial Ocean View', 'presidencial', 850.00, 'Lujosa suite de dos pisos con vista al mar, jacuzzi privado y servicio de mayordomo 24/7', 4, 'disponible', ARRAY['WiFi', 'TV 65"', 'Minibar', 'Jacuzzi', 'Vista al mar', 'Balcón privado', 'Mayordomo']),
('Suite Ejecutiva', 'suite', 450.00, 'Elegante suite con sala de estar, escritorio ejecutivo y amenidades premium', 3, 'disponible', ARRAY['WiFi', 'TV 55"', 'Minibar', 'Sala de estar', 'Escritorio', 'Cafetera']),
('Habitación Doble Superior', 'doble', 280.00, 'Cómoda habitación doble con dos camas queen y balcón', 2, 'disponible', ARRAY['WiFi', 'TV 43"', 'Minibar', 'Balcón', 'Caja fuerte']),
('Habitación Simple Deluxe', 'simple', 180.00, 'Habitación individual con todas las comodidades para viajeros de negocios', 1, 'disponible', ARRAY['WiFi', 'TV 43"', 'Escritorio', 'Cafetera', 'Plancha']),
('Suite Familiar', 'suite', 520.00, 'Amplia suite con dos habitaciones conectadas, ideal para familias', 5, 'disponible', ARRAY['WiFi', 'TV 55"', 'Minibar', 'Cocina pequeña', 'Sala de estar', 'Balcón']),
('Habitación Doble Standard', 'doble', 220.00, 'Habitación doble clásica con vista a la ciudad', 2, 'disponible', ARRAY['WiFi', 'TV 43"', 'Minibar', 'Caja fuerte']);