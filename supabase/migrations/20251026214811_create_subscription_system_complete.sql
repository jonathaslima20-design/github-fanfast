/*
  # Create Subscription System

  1. New Tables
    - `subscription_plans`
      - `id` (uuid, primary key)
      - `name` (text) - Nome do plano
      - `duration` (text) - Duração: Trimestral, Semestral, Anual
      - `price` (numeric) - Preço do plano
      - `checkout_url` (text) - URL de checkout opcional
      - `is_active` (boolean) - Se o plano está ativo
      - `display_order` (integer) - Ordem de exibição
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `plan_name` (text) - Nome do plano contratado
      - `monthly_price` (numeric) - Preço mensal
      - `billing_cycle` (enum) - Ciclo de cobrança: monthly, quarterly, semiannually, annually
      - `status` (enum) - Status: active, pending, cancelled, suspended
      - `payment_status` (enum) - Status de pagamento: paid, pending, overdue
      - `start_date` (timestamptz) - Data de início
      - `end_date` (timestamptz) - Data de término
      - `next_payment_date` (timestamptz) - Próxima data de pagamento
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `payments`
      - `id` (uuid, primary key)
      - `subscription_id` (uuid, foreign key to subscriptions)
      - `amount` (numeric) - Valor pago
      - `payment_date` (timestamptz) - Data do pagamento
      - `payment_method` (text) - Método de pagamento
      - `status` (enum) - Status: completed, pending, failed, refunded
      - `notes` (text) - Observações opcionais
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add policies for admin users
*/

-- Create enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_cycle_type') THEN
    CREATE TYPE billing_cycle_type AS ENUM ('monthly', 'quarterly', 'semiannually', 'annually');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status_type') THEN
    CREATE TYPE subscription_status_type AS ENUM ('active', 'pending', 'cancelled', 'suspended');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_type') THEN
    CREATE TYPE payment_status_type AS ENUM ('paid', 'pending', 'overdue');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_status_type') THEN
    CREATE TYPE payment_method_status_type AS ENUM ('completed', 'pending', 'failed', 'refunded');
  END IF;
END $$;

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration text NOT NULL CHECK (duration IN ('Trimestral', 'Semestral', 'Anual')),
  price numeric(10, 2) NOT NULL,
  checkout_url text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  monthly_price numeric(10, 2) NOT NULL,
  billing_cycle billing_cycle_type NOT NULL DEFAULT 'monthly',
  status subscription_status_type NOT NULL DEFAULT 'pending',
  payment_status payment_status_type NOT NULL DEFAULT 'pending',
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  next_payment_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL,
  payment_date timestamptz NOT NULL DEFAULT now(),
  payment_method text NOT NULL,
  status payment_method_status_type NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users
    WHERE id = auth.uid()
    AND (
      raw_user_meta_data->>'role' = 'admin'
      OR raw_app_meta_data->>'role' = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for subscription_plans (readable by all authenticated users)
CREATE POLICY "Authenticated users can view active subscription plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can insert subscription plans"
  ON subscription_plans FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update subscription plans"
  ON subscription_plans FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete subscription plans"
  ON subscription_plans FOR DELETE
  TO authenticated
  USING (is_admin());

-- Policies for subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can insert subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete subscriptions"
  ON subscriptions FOR DELETE
  TO authenticated
  USING (is_admin());

-- Policies for payments
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.id = payments.subscription_id
      AND (subscriptions.user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "Admins can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete payments"
  ON payments FOR DELETE
  TO authenticated
  USING (is_admin());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active, display_order);