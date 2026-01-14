import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

export type IntakeLeadInsert = {
  first_name: string;
  last_name: string;
  phone_number: string;
  zip_code: string | null;
  email: string;
  case_type: string | null;
  description: string | null;
  consent: boolean;
};

export type IntakeLeadRow = IntakeLeadInsert & {
  id: string;
  created_at: string;
};

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  private supabaseUrl = environment.supabaseUrl;
  private supabaseKey = environment.supabaseKey;

  constructor() {
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
  }

  async createLead(payload: IntakeLeadInsert) {
    const { data, error } = await this.supabase
      .from('intake_leads')
      .insert([payload])
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  // ✅ List leads (paged)
  async listLeads(params: { page: number; pageSize: number }) {
    const { page, pageSize } = params;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await this.supabase
      .from('intake_leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: (data ?? []) as IntakeLeadRow[], count: count ?? 0 };
  }

  // ✅ Update lead
  async updateLead(id: string, patch: Partial<IntakeLeadInsert>) {
    const { data, error } = await this.supabase
      .from('intake_leads')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as IntakeLeadRow;
  }

  // ✅ Delete lead
  async deleteLead(id: string) {
    const { error } = await this.supabase.from('intake_leads').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
}
