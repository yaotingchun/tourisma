// Interactive Proof Modal for raw Google Places reviews and extracted infrastructure evidence
export interface ReviewEvidenceItem {
  reviewId: string;
  dimension: 'accessibility' | 'parking' | 'facilities' | 'cleanliness' | 'crowding' | 'services';
  sentiment: 'positive' | 'negative' | 'mixed';
  exactQuote: string;
}

export interface FormattedReview {
  reviewId: string;
  author: string;
  authorPhotoUri?: string;
  authorUri?: string;
  rating: number;
  date: string;
  originalText: string;
}

export class ReviewsProofModal {
  private backdropEl: HTMLElement | null = null;
  private activeFilter: string = 'all';

  public open(
    destinationName: string,
    reviews: FormattedReview[],
    allEvidence: ReviewEvidenceItem[],
    focusReviewId?: string
  ): void {
    this.close();

    const backdrop = document.createElement('div');
    backdrop.className = 'dest-modal-backdrop';
    this.backdropEl = backdrop;

    const modal = document.createElement('div');
    modal.className = 'dest-modal-content';

    const renderModalContent = () => {
      // Build evidence map by reviewId
      const evidenceByReview: Record<string, ReviewEvidenceItem[]> = {};
      for (const ev of allEvidence) {
        if (!evidenceByReview[ev.reviewId]) {
          evidenceByReview[ev.reviewId] = [];
        }
        evidenceByReview[ev.reviewId].push(ev);
      }

      // Filter reviews if a dimension filter is active
      const filteredReviews = reviews.filter((r) => {
        if (this.activeFilter === 'all') return true;
        const evs = evidenceByReview[r.reviewId] || [];
        return evs.some((e) => e.dimension === this.activeFilter);
      });

      modal.innerHTML = `
        <div class="dest-modal-header">
          <div class="dest-modal-title-wrap">
            <div class="dest-card-badge">
              <span class="dest-badge-dot" style="background-color: #0284c7;"></span>
              <span>AUDIT TRAIL & EMPIRICAL EVIDENCE</span>
            </div>
            <h3 class="dest-modal-title">Visitor Review Proof: ${destinationName}</h3>
            <p class="dest-modal-desc">Original feedback returned by Google Places API (New) with verified verbatim infrastructure statements. <span class="dest-modal-limit-note">(Google Maps API strictly limits retrieval to a maximum of 5 reviews per destination)</span>.</p>
          </div>
          <button class="dest-modal-close-btn" aria-label="Close modal">&times;</button>
        </div>

        <!-- Filter bar -->
        <div class="dest-modal-filters">
          <button class="dest-filter-chip ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all">
            All Reviews (${reviews.length})
          </button>
          <button class="dest-filter-chip ${this.activeFilter === 'accessibility' ? 'active' : ''}" data-filter="accessibility">
            🚗 Accessibility
          </button>
          <button class="dest-filter-chip ${this.activeFilter === 'parking' ? 'active' : ''}" data-filter="parking">
            🅿️ Parking
          </button>
          <button class="dest-filter-chip ${this.activeFilter === 'facilities' ? 'active' : ''}" data-filter="facilities">
            🚻 Facilities
          </button>
          <button class="dest-filter-chip ${this.activeFilter === 'cleanliness' ? 'active' : ''}" data-filter="cleanliness">
            🧹 Cleanliness
          </button>
          <button class="dest-filter-chip ${this.activeFilter === 'crowding' ? 'active' : ''}" data-filter="crowding">
            👥 Crowding
          </button>
          <button class="dest-filter-chip ${this.activeFilter === 'services' ? 'active' : ''}" data-filter="services">
            🏪 Services
          </button>
        </div>

        <!-- Reviews List -->
        <div class="dest-modal-body">
          ${
            filteredReviews.length === 0
              ? `<div class="dest-modal-empty">No reviews in the available sample discussed <strong>${this.activeFilter}</strong>.</div>`
              : filteredReviews
                  .map((rev) => {
                    const evs = evidenceByReview[rev.reviewId] || [];
                    const isFocused = focusReviewId === rev.reviewId;
                    const stars = '★'.repeat(rev.rating) + '☆'.repeat(Math.max(0, 5 - rev.rating));

                    return `
                      <div class="dest-review-card ${isFocused ? 'focused' : ''}" id="modal-${rev.reviewId}">
                        <div class="dest-review-header">
                          <div class="dest-reviewer-info">
                            <span class="dest-reviewer-avatar">${rev.author.charAt(0).toUpperCase()}</span>
                            <div class="dest-reviewer-meta">
                              <span class="dest-reviewer-name">${rev.author}</span>
                              <span class="dest-review-date">${rev.date || 'Google Review'}</span>
                            </div>
                          </div>
                          <div class="dest-review-rating-wrap">
                            <span class="dest-review-stars">${stars}</span>
                            <span class="dest-review-id-tag">${rev.reviewId}</span>
                          </div>
                        </div>

                        <div class="dest-review-text">${this.escapeHtml(rev.originalText)}</div>

                        ${
                          evs.length > 0
                            ? `
                          <div class="dest-review-evidence-box">
                            <span class="dest-evidence-box-label">Verified Verbatim Sentences Identified:</span>
                            <div class="dest-evidence-chips-list">
                              ${evs
                                .map((e) => {
                                  const sColor =
                                    e.sentiment === 'positive'
                                      ? '#10b981'
                                      : e.sentiment === 'negative'
                                      ? '#ef4444'
                                      : '#f59e0b';
                                  const sBg =
                                    e.sentiment === 'positive'
                                      ? '#ecfdf5'
                                      : e.sentiment === 'negative'
                                      ? '#fef2f2'
                                      : '#fffbeb';
                                  const icon =
                                    e.dimension === 'accessibility'
                                      ? '🚗'
                                      : e.dimension === 'parking'
                                      ? '🅿️'
                                      : e.dimension === 'facilities'
                                      ? '🚻'
                                      : e.dimension === 'cleanliness'
                                      ? '🧹'
                                      : e.dimension === 'crowding'
                                      ? '👥'
                                      : '🏪';
                                  return `
                                    <div class="dest-evidence-quote-item" style="border-left: 3px solid ${sColor}; background: ${sBg};">
                                      <div class="dest-evidence-item-header">
                                        <span class="dest-evidence-dim-tag">${icon} ${e.dimension.toUpperCase()}</span>
                                        <span class="dest-evidence-sent-tag" style="color: ${sColor}; font-weight: 800;">${e.sentiment.toUpperCase()}</span>
                                      </div>
                                      <p class="dest-evidence-quote-text">"${this.escapeHtml(e.exactQuote)}"</p>
                                    </div>
                                  `;
                                })
                                .join('')}
                            </div>
                          </div>
                        `
                            : ''
                        }
                      </div>
                    `;
                  })
                  .join('')
          }
        </div>

        <div class="dest-modal-footer">
          <span class="dest-compliance-notice">
            Data obtained via Google Places API (New), which enforces a strict 5-review retrieval limit per location. Reviews and quotes are preserved verbatim under Google Maps Platform attribution terms.
          </span>
          <button class="dest-modal-dismiss-btn">Close</button>
        </div>
      `;

      // Event handlers
      modal.querySelector('.dest-modal-close-btn')?.addEventListener('click', () => this.close());
      modal.querySelector('.dest-modal-dismiss-btn')?.addEventListener('click', () => this.close());

      modal.querySelectorAll('.dest-filter-chip').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const filter = (e.currentTarget as HTMLElement).getAttribute('data-filter') || 'all';
          this.activeFilter = filter;
          renderModalContent();
        });
      });

      // If a specific review was focused, scroll to it
      if (focusReviewId) {
        setTimeout(() => {
          const target = modal.querySelector(`#modal-${focusReviewId}`);
          target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    };

    renderModalContent();
    backdrop.appendChild(modal);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    document.body.appendChild(backdrop);
  }

  public close(): void {
    if (this.backdropEl && this.backdropEl.parentNode) {
      this.backdropEl.parentNode.removeChild(this.backdropEl);
    }
    this.backdropEl = null;
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
