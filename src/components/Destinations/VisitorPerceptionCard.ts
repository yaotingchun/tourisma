import type { AttractionItem } from '../../data/attractionsData';
import { createInfoIcon } from '../Common/InfoTooltip';
import { ReviewsProofModal, type FormattedReview, type ReviewEvidenceItem } from './ReviewsProofModal';

export interface DimensionData {
  dimension: string;
  name: string;
  mentions: number;
  positive: number;
  mixed: number;
  negative: number;
  positivePct: number;
  mixedPct: number;
  negativePct: number;
  evidenceTier: 'unobserved' | 'limited' | 'moderate' | 'strong';
  evidenceLabel: string;
  headline: string;
  subtext: string;
  evidence: ReviewEvidenceItem[];
}

export interface VisitorQualityPayload {
  place: {
    id: string;
    name: string;
    address: string;
    rating: number;
    userRatingCount: number;
  } | null;
  dimensions: Record<string, DimensionData>;
  totalMentions: number;
  aiInsight: string;
  reviews: FormattedReview[];
  cachedAt?: string;
  fromCache?: boolean;
}

export class VisitorPerceptionCard {
  public readonly element: HTMLElement;
  private currentAttraction: AttractionItem;
  private payload: VisitorQualityPayload | null = null;
  private isLoading: boolean = false;
  private error: string | null = null;
  private proofModal: ReviewsProofModal;
  private abortController: AbortController | null = null;

  constructor(initialAttraction: AttractionItem) {
    this.currentAttraction = initialAttraction;
    this.proofModal = new ReviewsProofModal();
    this.element = document.createElement('section');
    this.element.className = 'dest-card dest-visitor-card';

    this.render();
    this.fetchData();
  }

  public setAttraction(attraction: AttractionItem): void {
    if (this.currentAttraction.id === attraction.id && this.payload) {
      return;
    }
    this.currentAttraction = attraction;
    this.payload = null;
    this.error = null;
    this.fetchData(false);
  }

  private async fetchData(forceRefresh: boolean = false): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    this.isLoading = true;
    this.error = null;
    this.render();

    try {
      const res = await fetch('/api/places/visitor-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: this.currentAttraction.name,
          stateName: this.currentAttraction.stateName,
          placeId: this.payload?.place?.id,
          refresh: forceRefresh,
          forceRefresh: forceRefresh,
        }),
        signal: this.abortController.signal,
      });

      if (!res.ok) {
        throw new Error(`Failed to load visitor perceptions (${res.status})`);
      }

      this.payload = await res.json();
    } catch (err: unknown) {
      if ((err as any)?.name === 'AbortError') return;
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  private render(): void {
    this.element.innerHTML = '';

    // Header with Title Group and Actions Bar (Gemini Badge + Refresh + Info Tooltip)
    const header = document.createElement('div');
    header.className = 'dest-card-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'dest-card-title-group';
    titleGroup.innerHTML = `
      <div class="dest-card-badge">
        <span class="dest-badge-dot" style="background-color: #0284c7;"></span>
        <span>EMPIRICAL VISITOR SENTIMENT</span>
      </div>
      <h3 class="dest-card-title">VISITOR-PERCEIVED INFRASTRUCTURE QUALITY</h3>
      <p class="dest-card-desc">Based on available Google reviews returned by Places API — Evaluated across 6 physical supply vectors</p>
    `;

    const actions = document.createElement('div');
    actions.className = 'dest-card-actions';
    actions.innerHTML = `
      <div class="gemini-badge-pill">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
        Gemini 2.5 Flash
      </div>
      <button class="refresh-findings-btn" id="btn-refresh-reviews" ${this.isLoading ? 'disabled' : ''} title="Refresh Google reviews & AI classification for ${this.currentAttraction.name}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="${this.isLoading ? 'dest-icon-spin' : ''}"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 16h5v5"></path></svg>
        <span>${this.isLoading ? 'Refreshing...' : 'Refresh'}</span>
      </button>
      <div id="visitor-info-icon-slot"></div>
    `;

    const infoIcon = createInfoIcon({
      sourceOrg: 'Google Maps Platform (Places API New) & Google Vertex AI',
      datasetName: 'Place Details Reviews & Gemini 2.5 Flash Infrastructure Classifier',
      referenceYear: 'Live / 2026 Baseline',
      measure: 'Share of analyzed visitor review mentions discussing accessibility, parking, facilities, cleanliness, crowding, and services.',
      formula: 'Multi-segment mention proportion (%) with evidence volume tiering and verbatim sentence extraction',
      limitations: 'Google Places API strictly limits data retrieval to a maximum of 5 reviews per destination. Evaluates qualitative visitor perception from the available Google review sample rather than a full census.',
    });

    const infoSlot = actions.querySelector('#visitor-info-icon-slot');
    if (infoSlot) {
      infoSlot.replaceWith(infoIcon);
    }

    const refreshBtn = actions.querySelector<HTMLButtonElement>('#btn-refresh-reviews');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.fetchData(true);
      });
    }

    header.appendChild(titleGroup);
    header.appendChild(actions);
    this.element.appendChild(header);

    if (this.isLoading) {
      const loadingEl = document.createElement('div');
      loadingEl.className = 'dest-visitor-loading';
      loadingEl.innerHTML = `
        <div class="dest-loading-spinner"></div>
        <span>Retrieving real-time Google Places reviews & classifying infrastructure evidence with Gemini 2.5 Flash for <strong>${this.currentAttraction.name}</strong>...</span>
      `;
      this.element.appendChild(loadingEl);
      return;
    }

    if (this.error) {
      const errBox = document.createElement('div');
      errBox.className = 'dest-visitor-error';
      errBox.innerHTML = `
        <p><strong>Note:</strong> ${this.error}</p>
        <button class="dest-retry-btn">Retry Analysis</button>
      `;
      errBox.querySelector('.dest-retry-btn')?.addEventListener('click', () => this.fetchData(true));
      this.element.appendChild(errBox);
      return;
    }

    if (!this.payload) return;

    const data = this.payload;
    const p = data.place;

    // Sub-bar with Google place rating badge, total mentions, limitation tag, and "View Original Review Proof" button
    const metaBar = document.createElement('div');
    metaBar.className = 'dest-visitor-metabar';

    const ratingHtml = p && p.rating
      ? `
        <div class="dest-visitor-rating-pill">
          <span class="dest-rating-star">★</span>
          <span class="dest-rating-score">${p.rating.toFixed(1)}</span>
          <span class="dest-rating-count">(${p.userRatingCount.toLocaleString()} total ratings on Google)</span>
        </div>
      `
      : '';

    metaBar.innerHTML = `
      <div class="dest-visitor-meta-left">
        ${ratingHtml}
        <div class="dest-mentions-badge">
          <strong>${data.totalMentions}</strong> infrastructure-related mentions analyzed
        </div>
        <span class="dest-api-limit-tag" title="Google Places API enforces a hard cap of 5 reviews per destination">
          <span class="dest-limit-icon">ℹ️</span> Google Maps API retrieves up to 5 reviews only
        </span>
      </div>
      <div class="dest-visitor-meta-right">
        <button class="dest-view-proof-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span>View All Reviews Proof (${data.reviews.length})</span>
        </button>
      </div>
    `;

    metaBar.querySelector('.dest-view-proof-btn')?.addEventListener('click', () => {
      this.openProofModal();
    });

    this.element.appendChild(metaBar);

    // AI Insight Box
    if (data.aiInsight) {
      const insightBox = document.createElement('div');
      insightBox.className = 'dest-visitor-insight-box';
      insightBox.innerHTML = `
        <div class="dest-insight-header">
          <span class="dest-insight-icon">💡</span>
          <span class="dest-insight-title">AI Infrastructure Synthesis</span>
          <span class="dest-insight-model-tag">Gemini 2.5 Flash</span>
        </div>
        <p class="dest-insight-text">${data.aiInsight}</p>
      `;
      this.element.appendChild(insightBox);
    }

    // 6 Infrastructure Dimensions Grid
    const dimsGrid = document.createElement('div');
    dimsGrid.className = 'dest-visitor-dims-grid';

    const dimIcons: Record<string, string> = {
      accessibility: '🚗',
      parking: '🅿️',
      facilities: '🚻',
      cleanliness: '🧹',
      crowding: '👥',
      services: '🏪',
    };

    const dimsOrder = ['accessibility', 'parking', 'facilities', 'cleanliness', 'crowding', 'services'];

    for (const key of dimsOrder) {
      const dim = data.dimensions[key];
      if (!dim) continue;

      const card = this.createDimensionCard(dim, dimIcons[key] || '📍');
      dimsGrid.appendChild(card);
    }

    this.element.appendChild(dimsGrid);
  }

  private createDimensionCard(dim: DimensionData, icon: string): HTMLElement {
    const card = document.createElement('div');
    card.className = 'dest-dim-card';

    // Evidence tier styling
    let tierColor = '#64748b';
    let tierBg = '#f1f5f9';
    if (dim.evidenceTier === 'strong') {
      tierColor = '#047857';
      tierBg = '#ecfdf5';
    } else if (dim.evidenceTier === 'moderate') {
      tierColor = '#0369a1';
      tierBg = '#f0f9ff';
    } else if (dim.evidenceTier === 'limited') {
      tierColor = '#b45309';
      tierBg = '#fffbeb';
    }

    // Proportional Segmented Bar
    let barHtml = '';
    if (dim.mentions === 0) {
      barHtml = `
        <div class="dest-segmented-bar empty">
          <div class="dest-bar-empty-fill" style="width: 100%;"></div>
        </div>
      `;
    } else {
      barHtml = `
        <div class="dest-segmented-bar">
          ${
            dim.positivePct > 0
              ? `<div class="dest-bar-segment positive" style="width: ${dim.positivePct}%;" title="Positive: ${dim.positive} (${dim.positivePct}%)"></div>`
              : ''
          }
          ${
            dim.mixedPct > 0
              ? `<div class="dest-bar-segment mixed" style="width: ${dim.mixedPct}%;" title="Mixed: ${dim.mixed} (${dim.mixedPct}%)"></div>`
              : ''
          }
          ${
            dim.negativePct > 0
              ? `<div class="dest-bar-segment negative" style="width: ${dim.negativePct}%;" title="Negative: ${dim.negative} (${dim.negativePct}%)"></div>`
              : ''
          }
        </div>
      `;
    }

    // Evidence snippet quotes
    let snippetsHtml = '';
    if (dim.evidence.length > 0) {
      const topEvidence = dim.evidence.slice(0, 2);
      snippetsHtml = `
        <div class="dest-dim-quotes-wrap">
          ${topEvidence
            .map((ev) => {
              const dotColor =
                ev.sentiment === 'positive'
                  ? '#10b981'
                  : ev.sentiment === 'negative'
                  ? '#ef4444'
                  : '#f59e0b';
              return `
                <div class="dest-dim-quote-chip" data-review-id="${ev.reviewId}" title="Click to view full review in Proof Modal">
                  <span class="dest-quote-dot" style="background-color: ${dotColor};"></span>
                  <span class="dest-quote-snippet">"${this.escapeHtml(ev.exactQuote)}"</span>
                  <span class="dest-quote-rev-id">#${ev.reviewId}</span>
                </div>
              `;
            })
            .join('')}
        </div>
      `;
    }

    card.innerHTML = `
      <div class="dest-dim-card-header">
        <div class="dest-dim-title-group">
          <span class="dest-dim-icon">${icon}</span>
          <span class="dest-dim-title">${dim.name}</span>
        </div>
        <span class="dest-dim-tier-badge" style="color: ${tierColor}; background: ${tierBg}; border: 1px solid ${tierColor}33;">
          ${dim.evidenceLabel} ${dim.mentions > 0 ? `(${dim.mentions} mention${dim.mentions > 1 ? 's' : ''})` : ''}
        </span>
      </div>

      ${barHtml}

      <div class="dest-dim-headline-wrap">
        <span class="dest-dim-headline">${dim.headline}</span>
        <span class="dest-dim-subtext">${dim.subtext}</span>
      </div>

      ${snippetsHtml}
    `;

    // Click quote to open Proof Modal focused on that review
    card.querySelectorAll('.dest-dim-quote-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        const revId = (e.currentTarget as HTMLElement).getAttribute('data-review-id');
        this.openProofModal(revId || undefined);
      });
    });

    return card;
  }

  private openProofModal(focusReviewId?: string): void {
    if (!this.payload) return;
    const allEvidence: ReviewEvidenceItem[] = [];
    for (const d of Object.values(this.payload.dimensions)) {
      allEvidence.push(...d.evidence);
    }
    this.proofModal.open(
      this.payload.place?.name || this.currentAttraction.name,
      this.payload.reviews,
      allEvidence,
      focusReviewId
    );
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
