import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error.html'
})
export class ErrorComponent {
  @Input() message = 'Une erreur est survenue.';
  @Input() details?: string;
}
