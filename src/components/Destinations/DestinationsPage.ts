import './destinations.css';
import { ATTRACTIONS_DATA, type AttractionItem } from '../../data/attractionsData';
import { AttractionSearchBar } from './AttractionSearchBar';
import { AttractionMapCard } from './AttractionMapCard';
import { AttractionProfileCard } from './AttractionProfileCard';
import { LocalDiagnosticCard } from './LocalDiagnosticCard';
import { StateContextSection } from './StateContextSection';
import { VisitorPerceptionCard } from './VisitorPerceptionCard';

export class DestinationsPage {
  public readonly element: HTMLElement;
  private currentAttraction: AttractionItem;

  private searchBar!: AttractionSearchBar;
  private mapCard!: AttractionMapCard;
  private profileCard!: AttractionProfileCard;
  private diagnosticCard!: LocalDiagnosticCard;
  private stateContextSection!: StateContextSection;
  private visitorPerceptionCard!: VisitorPerceptionCard;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'destinations-page';

    // Default to Cameron Highlands Tea Plantation as requested
    this.currentAttraction = ATTRACTIONS_DATA[0];

    this.render();
  }

  private handleSelectAttraction(attraction: AttractionItem): void {
    this.currentAttraction = attraction;
    this.searchBar.setAttraction(attraction);
    this.mapCard.setAttraction(attraction);
    this.profileCard.setAttraction(attraction);
    this.diagnosticCard.setAttraction(attraction);
    this.stateContextSection.setAttraction(attraction);
    this.visitorPerceptionCard.setAttraction(attraction);
  }

  private handleSelectState(stateId: string): void {
    // Find matching attraction in this state if available
    const match = ATTRACTIONS_DATA.find((a) => a.stateId === stateId);
    if (match) {
      this.handleSelectAttraction(match);
    }
  }

  private render(): void {
    this.element.innerHTML = '';

    // 1. Search Bar on Top
    this.searchBar = new AttractionSearchBar(
      this.currentAttraction,
      (selected) => this.handleSelectAttraction(selected)
    );
    this.element.appendChild(this.searchBar.element);

    // 2. Hero Stage Grid: Map on Left, Attraction Profile on Right
    const heroGrid = document.createElement('div');
    heroGrid.className = 'dest-hero-grid';

    this.mapCard = new AttractionMapCard(
      this.currentAttraction,
      (stateId) => this.handleSelectState(stateId)
    );

    this.profileCard = new AttractionProfileCard(this.currentAttraction);

    heroGrid.appendChild(this.mapCard.element);
    heroGrid.appendChild(this.profileCard.element);
    this.element.appendChild(heroGrid);

    // 3. Lower Dual-Layer Diagnostic Grid: Local Diagnostic Proxy + State Context
    const lowerGrid = document.createElement('div');
    lowerGrid.className = 'dest-lower-diagnostic-grid';

    this.diagnosticCard = new LocalDiagnosticCard(this.currentAttraction);
    this.stateContextSection = new StateContextSection(this.currentAttraction);

    lowerGrid.appendChild(this.diagnosticCard.element);
    lowerGrid.appendChild(this.stateContextSection.element);
    this.element.appendChild(lowerGrid);

    // 4. Ground-Truth Empirical Layer: Visitor-Perceived Infrastructure Quality
    this.visitorPerceptionCard = new VisitorPerceptionCard(this.currentAttraction);
    this.element.appendChild(this.visitorPerceptionCard.element);
  }
}

