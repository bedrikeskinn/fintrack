# FinTrack - Business & Personal Finance Tracker

A minimal, dark-mode financial tracking web app for solo operators. Track business and personal finances with clear dashboards, per-company isolation, and simple data entry.

## Features

- **Multi-Company Support**: Track finances for multiple businesses separately
- **Personal Finance Tracking**: Separate section for personal income and expenses
- **Global Date Filtering**: Filter all data by preset ranges (This Month, Last 30 Days) or custom dates
- **VAT Handling**: Manually enter VAT amounts with toggle for VAT included/excluded display
- **Multi-Currency Support**: Support for TRY, USD, EUR with automatic FX rate fetching
- **Client Management**: Track clients with budgets, contracts, and service categories
- **Project Management**: Organize work by projects linked to clients
- **Income Tracking**: Link income to clients, projects, or record as unlinked
- **Expense Tracking**: Categorize expenses for both company and personal use
- **CSV Export**: Export income and expenses to CSV files
- **Row Level Security**: Secure data isolation per user

## Tech Stack

- **Framework**: Next.js 13 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (dark mode)
- **UI Components**: shadcn/ui + Radix UI
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (email/password)

## Setup Instructions (Non-Developer Friendly)

### Step 1: Set Up Supabase

1. Go to [https://supabase.com](https://supabase.com) and create a free account
2. Click "New Project" and fill in:
   - **Project Name**: Choose any name (e.g., "FinTrack")
   - **Database Password**: Create a strong password (save this somewhere safe!)
   - **Region**: Choose the closest region to you
3. Wait for your project to be created (this takes about 2 minutes)

### Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, click on the **Settings** icon (gear icon) in the sidebar
2. Click on **API** in the settings menu
3. You'll see two important values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (a long string of characters)
4. Copy both of these - you'll need them in the next step

### Step 3: Configure Environment Variables

1. In the project folder, find the file called `.env` (or create it if it doesn't exist)
2. Open it and add these two lines (replace with your actual values):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Save the file

### Step 4: Run the Database Migration

1. Go back to your Supabase dashboard
2. Click on **SQL Editor** in the sidebar (it looks like a database icon)
3. Click **New Query** button
4. Copy the ENTIRE SQL migration code below and paste it into the SQL editor
5. Click **Run** button (or press Ctrl+Enter / Cmd+Enter)
6. You should see a success message

#### SQL Migration Code

```sql
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
```

### Step 5: Install Dependencies and Run the App

1. Open a terminal/command prompt in the project folder
2. Install the dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and go to: `http://localhost:3000`

### Step 6: Create Your Account

1. On the login page, click "Don't have an account? Sign up"
2. Enter your email and create a password (minimum 6 characters)
3. Click "Sign Up"
4. You'll be redirected to sign in - enter your credentials and click "Sign In"
5. You're now in! Start by creating your first company.

## Usage Guide

### Creating a Company

1. From the dashboard, click "Create Company"
2. Fill in the company name, optional description, and default currency
3. Click "Create Company"

### Managing Clients

1. Navigate to your company page
2. Click on the "Clients" tab
3. Click "Add Client" and fill in the details:
   - Name (required)
   - Website, payment method, budget, contract duration (optional)
   - Select service categories your client uses
   - Add VAT amount if applicable
   - Add any notes

### Managing Projects

1. Navigate to your company page
2. Click on the "Projects" tab
3. Click "Add Project" and fill in:
   - Project name (required)
   - Description
   - Link to a client (optional)
   - Start and end dates
   - Status (planned, active, or done)

### Recording Income

1. Navigate to your company page
2. Click on the "Income" tab
3. Click "Add Income"
4. Fill in the details:
   - Date and title (required)
   - Amount and VAT amount
   - Currency (auto-fetches FX rate if not TRY)
   - Link to a client or project, or leave unlinked with details

### Recording Expenses

1. For company expenses: Navigate to the company page → "Expenses" tab
2. For personal expenses: Navigate to "Personal" page → "Expenses" tab
3. Click "Add Expense"
4. Fill in date, title, amount, category, and currency

### Using Filters

- At the top of every page, you'll see the filter bar
- Choose a date range: This Month, Last 30 Days, or Custom Range
- Toggle VAT included/excluded to see totals with or without VAT
- All dashboards and lists update automatically

### Exporting Data

- On Income and Expenses pages, click "Export CSV"
- A CSV file will download with all records in the current date range

### Managing Settings

1. Click "Settings" in the header
2. Set your default currency
3. Manage expense categories (add, edit, or delete)

## Service Categories

When adding clients, you can select from these predefined service categories:

- Growth & Performance Marketing
- Brand Strategy
- Creative Production
- Social Media Management
- Influencer / KOL Marketing
- PR & Communications
- Web / Product / UX
- Web3 / AI Consulting

## Supported Currencies

- TRY (Turkish Lira)
- USD (US Dollar)
- EUR (Euro)

## Security

- All data is secured with Row Level Security (RLS)
- You can only see and modify your own data
- Each user's data is completely isolated
- Authentication is handled securely by Supabase

## Building for Production

To create a production build:

```bash
npm run build
```

To start the production server:

```bash
npm start
```

## Troubleshooting

**I can't sign in / sign up**
- Check that your Supabase credentials are correctly set in the `.env` file
- Make sure you ran the SQL migration in Supabase
- Check your internet connection

**Data isn't showing up**
- Make sure you're signed in
- Check the date filter - it might be filtering out your data
- Try refreshing the page

**Currency conversion isn't working**
- The app uses a free exchange rate API that might have rate limits
- You can always manually enter the FX rate when creating records

**I want to delete my account**
- Contact your Supabase project admin or delete the project from Supabase dashboard

## License

MIT License - feel free to use this for your own financial tracking!
