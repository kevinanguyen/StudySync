// Stub — replaced by `npx supabase gen types typescript` after schema is deployed.
// Permissive shape so the Supabase client compiles against any table name
// without type errors during bootstrapping. Real types enforce shape later.
type GenericTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      [K: string]: GenericTable;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
