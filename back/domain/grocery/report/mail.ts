import { Injectable } from '@nestjs/common';
import { MailMessage } from '../../../infrastructure/mail/type';
import { GroceryJobEventKind, GroceryJobStatus } from '../enum';
import { GroceryJob } from '../job/model';

const euros = (cents: number | undefined): string =>
  cents === undefined ? '—' : `${(cents / 100).toFixed(2).replace('.', ',')} €`;

// Anything that came from the shop is escaped: a product name is text the shop
// wrote, and it lands in an HTML document.
const escaped = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

@Injectable()
export class GroceryReportMail {
  build(to: string, job: GroceryJob, basketUrl: string): MailMessage {
    const attention = this.attentionOf(job);
    const shortfalls = job.events.filter(
      (event): boolean =>
        event.kind === GroceryJobEventKind.LINE_MISSING ||
        event.kind === GroceryJobEventKind.LINE_SUBSTITUTED,
    );

    const lines = [
      `Courses : ${euros(job.productsCents)}`,
      `Livraison : ${euros(job.deliveryFeesCents)}`,
      ...attention,
      shortfalls.length === 0
        ? 'Rien à signaler sur les produits.'
        : `${shortfalls.length} ligne(s) à regarder :`,
      ...shortfalls.map((event): string =>
        `- ${event.label ?? event.foodId ?? ''} ${event.detail ?? ''}`.trim(),
      ),
      '',
      'La commande et le paiement restent à toi : rien n’a été validé.',
      basketUrl,
    ];

    return {
      to,
      subject: this.subjectOf(job, attention.length > 0),
      text: lines.join('\n'),
      html: `<div style="font-family:system-ui,sans-serif;line-height:1.5">
  <p>${escaped(lines[0])}<br>${escaped(lines[1])}</p>
  ${attention.map((note): string => `<p style="font-weight:600">${escaped(note)}</p>`).join('')}
  <ul>${shortfalls
    .map(
      (event): string =>
        `<li><strong>${escaped(event.label ?? event.foodId ?? '')}</strong> ${escaped(event.detail ?? '')}</li>`,
    )
    .join('')}</ul>
  <p>La commande et le paiement restent à toi : rien n’a été validé.</p>
  <p><a href="${escaped(basketUrl)}">Ouvrir mon panier</a></p>
</div>`,
    };
  }

  // The blocking problem comes first and alone: below the order minimum
  // nothing can be ordered at all, and an advisory warning next to it would
  // only compete for attention.
  private attentionOf(job: GroceryJob): string[] {
    if ((job.shortOfMinimumCents ?? 0) > 0) {
      return [
        `Sous le minimum de commande : il manque ${euros(job.shortOfMinimumCents)} pour pouvoir commander.`,
      ];
    }

    return job.overThreshold
      ? [`Panier au-dessus de ton seuil d’alerte (${euros(job.alertThresholdCents)}).`]
      : [];
  }

  private subjectOf(job: GroceryJob, needsAttention: boolean): string {
    if (job.status === GroceryJobStatus.BLOCKED) {
      return 'Courses interrompues : il faut ton intervention';
    }

    if (job.status === GroceryJobStatus.FAILED) {
      return 'Le remplissage du panier a échoué';
    }

    return needsAttention ? 'Panier prêt, à vérifier' : 'Panier prêt';
  }
}
