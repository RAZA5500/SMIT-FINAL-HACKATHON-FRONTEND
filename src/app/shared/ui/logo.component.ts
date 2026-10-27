import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextId = 0;

/**
 * HCM Lite mark: two people forming an "H", joined by a smile (the team), with an AI spark between them,
 * on the blue → indigo brand tile. Keep in sync with public/favicon.svg and the boot mark in index.html.
 */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex shrink-0 rounded-[28%] shadow-glow-brand',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    role: 'img',
    'aria-label': 'HCM Lite',
  },
  template: `
    <svg viewBox="0 0 40 40" class="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient [attr.id]="id" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stop-color="#60A5FA" />
          <stop offset="0.55" stop-color="#3B82F6" />
          <stop offset="1" stop-color="#4F46E5" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" [attr.fill]="'url(#' + id + ')'" />
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="10.25" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-width="1.5" />
      <circle cx="13" cy="11.5" r="3.2" fill="#fff" />
      <circle cx="27" cy="11.5" r="3.2" fill="#fff" />
      <path d="M13 17.5V29M27 17.5V29" stroke="#fff" stroke-width="4" stroke-linecap="round" />
      <path d="M13 22.5c3.5 3.2 10.5 3.2 14 0" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" />
      <path d="M20 7.4l.8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8z" fill="#FDE68A" />
    </svg>
  `,
})
export class LogoComponent {
  readonly size = input(36);
  protected readonly id = `hcm-logo-${nextId++}`;
}
