/*
  # Add Preferred Currency to Clients

  ## Changes
  - Add `preferred_currency` column to clients table
  - This allows each client to have their own preferred currency
  - Income records linked to clients can default to this currency
  - Enables per-client revenue tracking in their preferred currency

  ## Notes
  - Default value is 'USD' for existing clients
  - This field will be used when creating income records linked to clients
*/

-- Add preferred_currency to clients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'preferred_currency'
  ) THEN
    ALTER TABLE clients ADD COLUMN preferred_currency text DEFAULT 'USD' NOT NULL;
  END IF;
END $$;