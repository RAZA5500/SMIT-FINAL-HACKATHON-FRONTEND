import { HttpResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { blobErrorMessage } from '../utils/http';
import { filenameFromDisposition, saveBlob } from '../utils/format';
import { PayrollService } from './payroll.service';
import { ToastService } from './toast.service';

/** Downloads (payslip PDFs, CSV export/template) with server-provided filenames. */
@Injectable({ providedIn: 'root' })
export class FileService {
  private readonly payroll = inject(PayrollService);
  private readonly toast = inject(ToastService);

  /** Id of the payslip currently downloading (for button spinners). */
  readonly downloadingPayslip = signal<string | null>(null);

  download(request: Observable<HttpResponse<Blob>>, fallbackName: string, onDone?: () => void): void {
    request.subscribe({
      next: (res) => {
        if (res.body) saveBlob(res.body, filenameFromDisposition(res.headers.get('Content-Disposition'), fallbackName));
        onDone?.();
      },
      error: async (error) => {
        onDone?.();
        this.toast.error('Download failed', await blobErrorMessage(error));
      },
    });
  }

  downloadPayslip(id: string, month?: string): void {
    this.downloadingPayslip.set(id);
    this.download(this.payroll.payslipPdf(id), `payslip-${month ?? id}.pdf`, () => this.downloadingPayslip.set(null));
  }
}
