-- Migration to add ON DELETE CASCADE to invoices table
-- This allows deleting an advert even if it has an associated invoice

DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find the name of the foreign key constraint on advert_id
    SELECT con.conname INTO constraint_name
    FROM pg_catalog.pg_constraint con
    INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
    INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'invoices'
      AND con.contype = 'f'
      AND 'advert_id' = ANY (
          SELECT attname 
          FROM pg_attribute 
          WHERE attrelid = rel.oid 
            AND attnum = ANY (con.conkey)
      );

    -- If found, drop it and recreate with ON DELETE CASCADE
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE invoices DROP CONSTRAINT ' || quote_ident(constraint_name);
        
        ALTER TABLE invoices 
        ADD CONSTRAINT invoices_advert_id_fkey 
        FOREIGN KEY (advert_id) 
        REFERENCES adverts(id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Updated invoices table foreign key to ON DELETE CASCADE';
    ELSE
        RAISE NOTICE 'Could not find foreign key constraint on invoices.advert_id';
    END IF;
END $$;
