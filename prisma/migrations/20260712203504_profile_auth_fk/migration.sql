-- Profile.id référence auth.users.id (géré par Supabase Auth, hors du schéma Prisma).
-- Si un compte Supabase Auth est supprimé, son Profile applicatif l'est aussi.
ALTER TABLE "Profile"
  ADD CONSTRAINT "Profile_id_fkey"
  FOREIGN KEY ("id") REFERENCES "auth"."users"("id")
  ON DELETE CASCADE;
