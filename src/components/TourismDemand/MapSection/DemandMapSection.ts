import { DemandMap } from './DemandMap';
import { DemandMapProfile } from './DemandMapProfile';

export class DemandMapSection {
  public readonly element: HTMLElement;
  private map: DemandMap;
  private profile: DemandMapProfile;

  constructor(onSelectState?: (stateId: string | null) => void) {
    this.element = document.createElement('div');
    this.element.className = 'demand-map-section';
    this.element.style.display = 'flex';
    this.element.style.gap = '14px';

    this.profile = new DemandMapProfile(() => {
      this.map.setSelectedState(null);
      if (onSelectState) onSelectState(null);
    });

    this.map = new DemandMap((stateId) => {
      this.profile.setSelectedState(stateId);
      if (onSelectState) onSelectState(stateId);
    });

    this.render();
  }

  private render(): void {
    this.element.innerHTML = '';
    
    // Wrap map in a container that takes remaining space
    const mapContainer = document.createElement('div');
    mapContainer.style.flex = '1';
    mapContainer.style.minWidth = '0';
    mapContainer.appendChild(this.map.element);

    this.element.appendChild(mapContainer);
    this.element.appendChild(this.profile.element);
  }

  public setSelectedState(stateId: string | null): void {
    this.map.setSelectedState(stateId);
    this.profile.setSelectedState(stateId);
  }

  public destroy(): void {
    if (this.map) {
      this.map.destroy();
    }
  }
}
