/*
  # Financial Tracking App Database Schema

  ## Overview
  This migration creates the complete database schema for a multi-company financial tracking application
  with personal finance tracking, multi-currency support, VAT handling, and comprehensive linking between
  entities (companies, clients, projects, income, expenses).

  ## Tables Created

  1. **user_settings**
     - Stores user preferences (default currency, display options)
     - One record per user

  2. **expense_categories**
     - User-managed expense categories
     - Used for both company and personal expenses

  3. **companies**
     - Business entities owned by the user
     - Each company has its own currency and isolated data

  4. **clients**
     - Clients belong to a specific company
     - Include service categories, budgets, and VAT defaults
     - Services field stores array of predefined service categories

  5. **projects**
     - Projects belong to a company and optionally to a client
     - Track status (planned/active/done) and dates

  6. **income**
     - Income records for companies
     - Can be linked to clients and/or projects
     - Multi-currency with FX rate tracking
     - Includes VAT handling

  7. **expenses**
     - Expense records for both companies and personal use
     - Scope field determines if company or personal
     - Multi-currency with FX rate tracking

  8. **personal_income**
     - Income records for personal finances
     - Simplified structure compared to company income

  ## Security (RLS Policies)
  - All tables have RLS enabled
  - Users can only access their own data
  - Company-scoped data is further restricted by company ownership
  - Policies for SELECT, INSERT, UPDATE, DELETE operations

  ## Important Notes
  - VAT amounts are manually entered by users (no automatic calculation)
  - FX rates are captured at entry time and user-editable
  - Cascading deletes are handled via foreign keys
  - All monetary amounts stored as DECIMAL for precision
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  default_currency text DEFAULT 'USD' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. EXPENSE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON expense_categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON expense_categories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON expense_categories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  default_currency text DEFAULT 'USD' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own companies"
  ON companies FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own companies"
  ON companies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  website text,
  monthly_budget decimal(15,2),
  contract_months integer,
  vat_amount decimal(15,2),
  payment_method text,
  services text[] DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clients of own companies"
  ON clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = clients.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert clients to own companies"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = clients.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update clients of own companies"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = clients.company_id
      AND companies.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = clients.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete clients of own companies"
  ON clients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = clients.company_id
      AND companies.user_id = auth.uid()
    )
  );

-- 5. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date,
  status text DEFAULT 'planned' NOT NULL CHECK (status IN ('planned', 'active', 'done')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view projects of own companies"
  ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = projects.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert projects to own companies"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = projects.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update projects of own companies"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = projects.company_id
      AND companies.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = projects.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete projects of own companies"
  ON projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = projects.company_id
      AND companies.user_id = auth.uid()
    )
  );

-- 6. INCOME TABLE
CREATE TABLE IF NOT EXISTS income (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  title text NOT NULL,
  amount decimal(15,2) NOT NULL,
  vat_amount decimal(15,2) DEFAULT 0,
  currency text DEFAULT 'USD' NOT NULL,
  fx_rate_to_try decimal(10,4),
  try_amount decimal(15,2),
  linked_type text DEFAULT 'none' CHECK (linked_type IN ('client', 'project', 'none')),
  linked_client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  linked_project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  details text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view income of own companies"
  ON income FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = income.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert income to own companies"
  ON income FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = income.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update income of own companies"
  ON income FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = income.company_id
      AND companies.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = income.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete income of own companies"
  ON income FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = income.company_id
      AND companies.user_id = auth.uid()
    )
  );

-- 7. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scope text NOT NULL CHECK (scope IN ('company', 'personal')),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  date date NOT NULL,
  title text NOT NULL,
  amount decimal(15,2) NOT NULL,
  vat_amount decimal(15,2) DEFAULT 0,
  currency text DEFAULT 'USD' NOT NULL,
  fx_rate_to_try decimal(10,4),
  try_amount decimal(15,2),
  expense_category text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_company_scope CHECK (
    (scope = 'company' AND company_id IS NOT NULL) OR
    (scope = 'personal' AND company_id IS NULL)
  )
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 8. PERSONAL INCOME TABLE
CREATE TABLE IF NOT EXISTS personal_income (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  title text NOT NULL,
  amount decimal(15,2) NOT NULL,
  vat_amount decimal(15,2) DEFAULT 0,
  currency text DEFAULT 'USD' NOT NULL,
  fx_rate_to_try decimal(10,4),
  try_amount decimal(15,2),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE personal_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own personal income"
  ON personal_income FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personal income"
  ON personal_income FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personal income"
  ON personal_income FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own personal income"
  ON personal_income FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_income_company_id ON income(company_id);
CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_personal_income_user_id ON personal_income(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_income_date ON personal_income(date);
CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id ON expense_categories(user_id);

-- INSERT DEFAULT EXPENSE CATEGORIES FOR NEW USERS
-- This will be handled in the app during user setup