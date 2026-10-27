import { animate, group, query, stagger, style, transition, trigger } from '@angular/animations';

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** Quiet route transitions: the old page leaves instantly, the new one fades up a few pixels. */
export const routeTransition = trigger('routeTransition', [
  transition('* <=> *', [
    query(':leave', [style({ display: 'none' })], { optional: true }),
    query(':enter', [style({ opacity: 0, transform: 'translateY(6px)' }), animate(`240ms ${EASE_OUT}`, style({ opacity: 1, transform: 'none' }))], {
      optional: true,
    }),
  ]),
]);

/** Staggered entrance for lists and card grids — bind to the item count. */
export const listStagger = trigger('listStagger', [
  transition('* => *', [
    query(
      ':enter',
      [style({ opacity: 0, transform: 'translateY(6px)' }), stagger(30, [animate(`260ms ${EASE_OUT}`, style({ opacity: 1, transform: 'none' }))])],
      { optional: true },
    ),
  ]),
]);

export const fadeInUp = trigger('fadeInUp', [
  transition(':enter', [style({ opacity: 0, transform: 'translateY(6px)' }), animate(`260ms ${EASE_OUT}`, style({ opacity: 1, transform: 'none' }))]),
  transition(':leave', [animate('160ms ease-in', style({ opacity: 0, transform: 'translateY(6px)' }))]),
]);

export const fade = trigger('fade', [
  transition(':enter', [style({ opacity: 0 }), animate('220ms ease-out', style({ opacity: 1 }))]),
  transition(':leave', [animate('180ms ease-in', style({ opacity: 0 }))]),
]);

/** Right-hand slide-over panel (drawers, diff viewer). */
export const slideOver = trigger('slideOver', [
  transition(':enter', [style({ transform: 'translateX(100%)' }), animate(`320ms ${EASE_OUT}`, style({ transform: 'translateX(0)' }))]),
  transition(':leave', [animate('260ms cubic-bezier(0.4, 0, 1, 1)', style({ transform: 'translateX(100%)' }))]),
]);

/** Left off-canvas panel (mobile sidebar). */
export const slideInLeft = trigger('slideInLeft', [
  transition(':enter', [style({ transform: 'translateX(-100%)' }), animate(`360ms ${EASE_OUT}`, style({ transform: 'translateX(0)' }))]),
  transition(':leave', [animate('220ms ease-in', style({ transform: 'translateX(-100%)' }))]),
]);

/** Dialog panel: scale + rise. */
export const modalPop = trigger('modalPop', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(8px) scale(0.985)' }),
    animate(`240ms ${EASE_OUT}`, style({ opacity: 1, transform: 'none' })),
  ]),
  transition(':leave', [animate('180ms ease-in', style({ opacity: 0, transform: 'translateY(8px) scale(0.98)' }))]),
]);

/** Dropdown menus. */
export const dropdown = trigger('dropdown', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(-6px) scale(0.98)' }),
    animate(`200ms ${EASE_OUT}`, style({ opacity: 1, transform: 'none' })),
  ]),
  transition(':leave', [animate('140ms ease-in', style({ opacity: 0, transform: 'translateY(-4px) scale(0.98)' }))]),
]);

export const toastAnim = trigger('toastAnim', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(24px) scale(0.96)' }),
    animate(`340ms ${EASE_OUT}`, style({ opacity: 1, transform: 'none' })),
  ]),
  transition(':leave', [animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(24px)', height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }))]),
]);

/** Height expand/collapse for accordions and inline panels. */
export const expand = trigger('expand', [
  transition(':enter', [
    style({ height: 0, opacity: 0, overflow: 'hidden' }),
    group([animate(`320ms ${EASE_OUT}`, style({ height: '*' })), animate('260ms 60ms ease-out', style({ opacity: 1 }))]),
  ]),
  transition(':leave', [style({ overflow: 'hidden' }), group([animate('220ms ease-in', style({ height: 0 })), animate('160ms ease-in', style({ opacity: 0 }))])]),
]);
