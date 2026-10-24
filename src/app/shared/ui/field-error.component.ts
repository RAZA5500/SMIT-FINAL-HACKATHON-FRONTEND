import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { PASSWORD_RULE } from '../../core/utils/validators';
import { Icons } from './icons';

/** Shows the first validation message of a control once it has been touched. */
@Component({
  selector: 'app-field-error',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message(); as msg) {
      <p class="field-error">
        <lucide-icon [img]="icons.CircleAlert" [size]="13" [strokeWidth]="2.4" />
        {{ msg }}
      </p>
    }
  `,
})
export class FieldErrorComponent {
  readonly control = input.required<AbstractControl | null>();
  readonly label = input('This field');
  /** Force-show (e.g. after a submit attempt). */
  readonly show = input(false);

  protected readonly icons = Icons;
  /** Bumped on every value / status / touched change of the control. */
  private readonly tick = signal(0);

  constructor() {
    effect((onCleanup) => {
      const control = this.control();
      if (!control) return;
      const sub = control.events.subscribe(() => this.tick.update((n) => n + 1));
      onCleanup(() => sub.unsubscribe());
    });
  }

  protected readonly message = computed(() => {
    this.tick();
    const control = this.control();
    if (!control?.errors || (!control.touched && !this.show())) return null;
    const e = control.errors;
    const label = this.label();
    if (e['required']) return `${label} is required.`;
    if (e['email']) return 'Enter a valid email address.';
    if (e['minlength']) return `${label} must be at least ${e['minlength'].requiredLength} characters.`;
    if (e['maxlength']) return `${label} must be at most ${e['maxlength'].requiredLength} characters.`;
    if (e['min']) return `${label} must be at least ${e['min'].min}.`;
    if (e['max']) return `${label} must be at most ${e['max'].max}.`;
    if (e['passwordPolicy']) return PASSWORD_RULE;
    if (e['pattern']) return `${label} has an invalid format.`;
    if (e['blank']) return `${label} cannot be blank.`;
    if (e['server']) return String(e['server']);
    return `${label} is invalid.`;
  });
}
