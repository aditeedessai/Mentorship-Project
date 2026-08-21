import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://hfwdvnnhoxjuwdjnwoer.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_eol7NhkvRN-mLTtQhEk5WQ_fTrRTu8F";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
