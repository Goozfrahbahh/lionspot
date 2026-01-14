import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IntakeLeadRow, SupabaseService, IntakeLeadInsert } from './shared/services/supabase.service';

type CaseTypeOption = { value: string; label: string };

@Component({
  selector: 'app-root',
  template: `
    <div class="w-full p-4 md:p-6">
  <div class="mx-auto max-w-7xl space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Intake Leads</h1>
        <p class="text-sm text-slate-500">View, search, edit, and manage incoming leads.</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          (click)="load()"
          [disabled]="loading"
        >
          Refresh
        </button>
      </div>
    </div>

    <div *ngIf="errorMsg" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ errorMsg }}
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-4">
      <div class="md:col-span-2">
        <label class="text-xs font-medium text-slate-600">Search</label>
        <input
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          placeholder="Name, email, or phone..."
          [(ngModel)]="search"
          (ngModelChange)="applyFilters()"
        />
      </div>

      <div>
        <label class="text-xs font-medium text-slate-600">Case Type</label>
        <select
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          [(ngModel)]="filterCaseType"
          (ngModelChange)="applyFilters()"
        >
          <option *ngFor="let opt of caseTypeOptions" [value]="opt.value">{{ opt.label }}</option>
        </select>
      </div>

      <div>
        <label class="text-xs font-medium text-slate-600">Consent</label>
        <select
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          [(ngModel)]="filterConsent"
          (ngModelChange)="applyFilters()"
        >
          <option value="all">All</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
    </div>

    <!-- Main split -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- Left: table -->
      <div class="lg:col-span-2 rounded-2xl border border-slate-200 bg-white">
        <div class="flex items-center justify-between border-b border-slate-200 p-4">
          <div class="text-sm text-slate-600">
            Showing <span class="font-semibold text-slate-900">{{ filtered.length }}</span> of
            <span class="font-semibold text-slate-900">{{ leads.length }}</span> (page {{ page }} / {{ totalPages }})
          </div>

          <div class="flex items-center gap-2">
            <button
              class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              (click)="prevPage()"
              [disabled]="loading || page <= 1"
            >
              Prev
            </button>
            <button
              class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              (click)="nextPage()"
              [disabled]="loading || page >= totalPages"
            >
              Next
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th class="px-4 py-3">Name</th>
                <th class="px-4 py-3">Email</th>
                <th class="px-4 py-3">Phone</th>
                <th class="px-4 py-3">Case Type</th>
                <th class="px-4 py-3">Created</th>
              </tr>
            </thead>

            <tbody>
              <tr
                *ngFor="let l of filtered"
                class="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                [class.bg-slate-50]="selected?.id === l.id"
                (click)="selectLead(l)"
              >
                <td class="px-4 py-3 font-medium text-slate-900">
                  {{ l.first_name }} {{ l.last_name }}
                  <div class="text-xs text-slate-500" *ngIf="l.consent">Consent ✅</div>
                </td>
                <td class="px-4 py-3 text-slate-700">{{ l.email }}</td>
                <td class="px-4 py-3 text-slate-700">{{ l.phone_number }}</td>
                <td class="px-4 py-3 text-slate-700">{{ l.case_type || '—' }}</td>
                <td class="px-4 py-3 text-slate-600">
                  {{ l.created_at | date : 'MMM d, y, h:mm a' }}
                </td>
              </tr>

              <tr *ngIf="!loading && filtered.length === 0">
                <td colspan="5" class="px-4 py-8 text-center text-slate-500">No leads match your filters.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Right: details -->
      <div class="rounded-2xl border border-slate-200 bg-white">
        <div class="border-b border-slate-200 p-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold text-slate-900">Lead Details</div>
              <div class="text-xs text-slate-500" *ngIf="selected">
                ID: {{ selected.id }}
              </div>
            </div>

            <button
              class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              (click)="clearSelection()"
              [disabled]="loading"
            >
              Clear
            </button>
          </div>
        </div>

        <div class="p-4" *ngIf="!selected">
          <div class="text-sm text-slate-600">Select a lead to view and edit details.</div>
        </div>

        <form class="space-y-3 p-4" *ngIf="selected" [formGroup]="form">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="text-xs font-medium text-slate-600">First Name</label>
              <input class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                     formControlName="first_name" />
            </div>
            <div>
              <label class="text-xs font-medium text-slate-600">Last Name</label>
              <input class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                     formControlName="last_name" />
            </div>
          </div>

          <div>
            <label class="text-xs font-medium text-slate-600">Email</label>
            <input class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                   formControlName="email" />
          </div>

          <div>
            <label class="text-xs font-medium text-slate-600">Phone</label>
            <input class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                   formControlName="phone_number" />
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="text-xs font-medium text-slate-600">Zip Code</label>
              <input class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                     formControlName="zip_code" />
            </div>
            <div>
              <label class="text-xs font-medium text-slate-600">Case Type</label>
              <input class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                     formControlName="case_type" />
            </div>
          </div>

          <div>
            <label class="text-xs font-medium text-slate-600">Description</label>
            <textarea class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      rows="4"
                      formControlName="description"></textarea>
          </div>

          <label class="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" formControlName="consent" />
            Consent given
          </label>

          <div class="flex items-center gap-2 pt-2">
            <button
              type="button"
              class="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              (click)="save()"
              [disabled]="loading"
            >
              Save
            </button>

            <button
              type="button"
              class="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              (click)="deleteSelected()"
              [disabled]="loading"
            >
              Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>

  `,
})
export class AppComponent implements OnInit {
  loading = false;
  errorMsg: string | null = null;

  // data
  leads: IntakeLeadRow[] = [];
  filtered: IntakeLeadRow[] = [];

  // selection
  selected: IntakeLeadRow | null = null;

  // ui
  page = 1;
  pageSize = 25;
  totalCount = 0;

  search = '';
  filterCaseType: string = 'all';
  filterConsent: 'all' | 'yes' | 'no' = 'all';

  caseTypeOptions: CaseTypeOption[] = [
    { value: 'all', label: 'All Case Types' },
    { value: 'Labor Law', label: 'Labor Law' },
    { value: 'Motor Vehicle Accident', label: 'Motor Vehicle Accident' },
    { value: 'Personal Injury', label: 'Personal Injury' },
    { value: 'Other', label: 'Other' },
  ];

  // edit form (right panel)
  form!: FormGroup;

  constructor(private sb: SupabaseService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      phone_number: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      zip_code: [''],
      case_type: [''],
      description: [''],
      consent: [false],
    });

    this.load();
  }

  async load() {
    this.loading = true;
    this.errorMsg = null;
    try {
      const res = await this.sb.listLeads({ page: this.page, pageSize: this.pageSize });
      this.leads = res.data;
      this.totalCount = res.count;
      this.applyFilters();

      // keep selection if possible
      if (this.selected) {
        const stillThere = this.leads.find(l => l.id === this.selected!.id);
        if (stillThere) this.selectLead(stillThere);
        else this.selected = null;
      }
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Failed to load leads';
    } finally {
      this.loading = false;
    }
  }

  applyFilters() {
    const q = this.search.trim().toLowerCase();

    this.filtered = this.leads.filter(l => {
      const matchesSearch =
        !q ||
        `${l.first_name} ${l.last_name}`.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.phone_number.toLowerCase().includes(q);

      const matchesCase =
        this.filterCaseType === 'all' || (l.case_type ?? '').toLowerCase() === this.filterCaseType.toLowerCase();

      const matchesConsent =
        this.filterConsent === 'all' ||
        (this.filterConsent === 'yes' ? l.consent === true : l.consent === false);

      return matchesSearch && matchesCase && matchesConsent;
    });
  }

  selectLead(lead: IntakeLeadRow) {
    this.selected = lead;
    this.form.reset({
      first_name: lead.first_name,
      last_name: lead.last_name,
      phone_number: lead.phone_number,
      email: lead.email,
      zip_code: lead.zip_code,
      case_type: lead.case_type,
      description: lead.description,
      consent: lead.consent,
    });
  }

  clearSelection() {
    this.selected = null;
    this.form.reset();
  }

  async save() {
    if (!this.selected) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMsg = null;
    try {
      const patch = this.form.value as Partial<IntakeLeadInsert>;
      const updated = await this.sb.updateLead(this.selected.id, patch);

      // update local lists
      this.leads = this.leads.map(l => (l.id === updated.id ? updated : l));
      this.applyFilters();
      this.selectLead(updated);
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Failed to save lead';
    } finally {
      this.loading = false;
    }
  }

  async deleteSelected() {
    if (!this.selected) return;
    const ok = confirm(`Delete lead: ${this.selected.first_name} ${this.selected.last_name}?`);
    if (!ok) return;

    this.loading = true;
    this.errorMsg = null;
    try {
      await this.sb.deleteLead(this.selected.id);
      this.selected = null;
      await this.load();
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Failed to delete lead';
    } finally {
      this.loading = false;
    }
  }

  // paging
  get totalPages() {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  async nextPage() {
    if (this.page >= this.totalPages) return;
    this.page++;
    await this.load();
  }

  async prevPage() {
    if (this.page <= 1) return;
    this.page--;
    await this.load();
  }
}
