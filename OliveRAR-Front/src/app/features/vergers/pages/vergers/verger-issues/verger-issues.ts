import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VergerIssue } from '../../../models/verger-issue.model';
import { VergerIssueService } from '../../../services/verger-issue.service';
import { VergerApiService } from '../../../services/verger-api.service';
import { Verger } from '../../../models/verger.model';
import { User } from '../../../../../core/auth/auth.service';

@Component({
  selector: 'app-verger-issues',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './verger-issues.html',
  styleUrl: './verger-issues.css'
})
export class VergerIssuesComponent implements OnInit, OnChanges {
  @Input() vergerId: string | null = null;
  @Input() vergerNom: string | null = null;
  @Input() user: User | null = null;

  issues: VergerIssue[] = [];
  vergers: Verger[] = [];
  loading = false;
  error = '';

  filters = {
    statut: '',
    type: '',
    gravite: ''
  };

  showModal = false;
  isEditing = false;
  issueForm: FormGroup;
  currentIssueId: string | null = null;

  showDeleteModal = false;
  issueToDelete: VergerIssue | null = null;

  toast = { message: '', type: 'success' as 'success' | 'error', show: false };

  constructor(
    private issueService: VergerIssueService,
    private vergerApi: VergerApiService,
    private fb: FormBuilder
  ) {
    this.issueForm = this.fb.group({
      vergerId: ['', Validators.required],
      type: ['', Validators.required],
      gravite: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]],
      notes: [''],
      statut: ['SIGNALE']
    });
  }

  ngOnInit() {
    if (this.vergerId) {
      this.loadIssues();
    } else {
      this.loadIssues();
      this.loadVergers();
    }
  }

  loadVergers() {
    this.vergerApi.getAll().subscribe({
      next: (data) => {
        this.vergers = data;
      },
      error: (err) => console.error('Erreur lors du chargement des vergers', err)
    });
  }

  getVergerName(id: string): string {
    const verger = this.vergers.find(v => v.id === id);
    return verger ? verger.nom : `ID: ${id.substring(id.length - 4)}`;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['vergerId'] && !changes['vergerId'].firstChange) {
      this.loadIssues();
    }
  }

  loadIssues() {
    this.loading = true;
    const filters: any = { ...this.filters };
    if (this.vergerId) {
      filters.vergerId = this.vergerId;
    }
    this.issueService.getAll(filters).subscribe({
      next: (data) => {
        this.issues = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des problèmes.';
        this.loading = false;
      }
    });
  }

  applyFilters() {
    this.loadIssues();
  }

  resetFilters() {
    this.filters = { statut: '', type: '', gravite: '' };
    this.loadIssues();
  }

  openCreate() {
    this.isEditing = false;
    this.currentIssueId = null;
    this.issueForm.reset({
      vergerId: this.vergerId || '',
      type: '',
      gravite: '',
      description: '',
      notes: '',
      statut: 'SIGNALE'
    });
    this.showModal = true;
  }

  openEdit(issue: VergerIssue) {
    this.isEditing = true;
    this.currentIssueId = issue.id || null;
    this.issueForm.patchValue({
      vergerId: issue.vergerId,
      type: issue.type,
      gravite: issue.gravite,
      description: issue.description,
      notes: issue.notes,
      statut: issue.statut
    });
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveIssue() {
    if (this.issueForm.invalid) return;

    const issueData: VergerIssue = {
      ...this.issueForm.value
    };

    const request = this.isEditing && this.currentIssueId
      ? this.issueService.update(this.currentIssueId, issueData)
      : this.issueService.create(issueData);

    request.subscribe({
      next: () => {
        this.showToast(this.isEditing ? 'Problème mis à jour.' : 'Problème signalé.', 'success');
        this.closeModal();
        this.loadIssues();
      },
      error: (err) => {
        this.showToast(err?.error?.message || 'Erreur lors de l\'enregistrement.', 'error');
      }
    });
  }

  confirmDelete(issue: VergerIssue) {
    this.issueToDelete = issue;
    this.showDeleteModal = true;
  }

  deleteIssue() {
    if (!this.issueToDelete?.id) return;
    this.issueService.delete(this.issueToDelete.id).subscribe({
      next: () => {
        this.showToast('Problème supprimé.', 'success');
        this.showDeleteModal = false;
        this.loadIssues();
      },
      error: () => {
        this.showToast('Erreur suppression.', 'error');
        this.showDeleteModal = false;
      }
    });
  }

  changeStatut(issue: VergerIssue, newStatut: string) {
    const updatedIssue = { ...issue, statut: newStatut as any };
    this.issueService.update(issue.id!, updatedIssue).subscribe({
      next: () => {
        this.showToast('Statut mis à jour.', 'success');
        this.loadIssues();
      },
      error: (err) => {
        this.showToast(err?.error?.message || 'Transition impossible.', 'error');
      }
    });
  }

  getGraviteClass(gravite: string): string {
    switch (gravite) {
      case 'CRITIQUE': return 'bg-red-100 text-red-700 border-red-200';
      case 'MOYENNE': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'FAIBLE': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'SIGNALE': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'EN_COURS': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'RESOLU': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  }

  get canManage(): boolean {
    return this.user?.role === 'RESPONSABLE_COOPERATIVE' || this.user?.role === 'RESPONSABLE_LOGISTIQUE';
  }

  private showToast(message: string, type: 'success' | 'error') {
    this.toast = { message, type, show: true };
    setTimeout(() => this.toast.show = false, 3000);
  }
}
