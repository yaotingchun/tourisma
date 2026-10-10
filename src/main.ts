import './style.css';
import './components/Destinations/destinations.css';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Header } from './components/Header/Header';
import { Footer } from './components/Footer/Footer';
import { OverviewPage } from './components/Overview/OverviewPage';
import { TourismDemandPage } from './components/TourismDemand/TourismDemandPage';
import { TourismAssetsPage } from './components/TourismAssets/TourismAssetsPage';
import { AccommodationPage } from './components/Accommodation/AccommodationPage';
import { AccessibilityPage } from './components/Accessibility/AccessibilityPage';
import { HealthcarePage } from './components/Healthcare/HealthcarePage';
import { SustainabilityPage } from './components/Sustainability/SustainabilityPage';
import { DestinationsPage } from './components/Destinations/DestinationsPage';
import { TourismPressurePage } from './components/TourismPressure/TourismPressurePage';
import { DecisionEngineChatbot } from './components/DecisionEngine/DecisionEngineChatbot';


function initializeApp(): void {
  const appRoot = document.getElementById('app');
  if (!appRoot) {
    throw new Error('Root element #app was not found.');
  }

  // App container layout
  const appLayout = document.createElement('div');
  appLayout.className = 'app-layout';

  // Instantiate modular Sidebar component
  const sidebar = new Sidebar((navId) => {
    console.log(`Navigation changed to: ${navId}`);
    if (navId === 'overview') {
      header.setTitle('NATIONAL OVERVIEW', 'Tourism Performance & State Capacity Diagnostic');
      renderOverview();
    } else if (navId === 'tourism-demand') {
      header.setTitle('TOURISM DEMAND & ORIGINS', 'Source Market Dynamics, Seasonality Heatmaps & Predictive Forecasts');
      renderTourismDemand();
    } else if (navId === 'tourism-pressure') {
      header.setTitle('TOURISM PRESSURE & SCENARIO LAB', 'Current Infrastructure Pressure & What-If Stress Testing');
      renderTourismPressure();
    } else if (navId === 'tourism-assets') {
      header.setTitle('TOURISM ASSETS', 'Core Attractions & Supporting Tourism Inventory');
      renderTourismAssets();
    } else if (navId === 'accommodation') {
      header.setTitle('ACCOMMODATION', 'Capacity, Rooms & Establishment Diagnostic');
      renderAccommodation();
    } else if (navId === 'accessibility') {
      header.setTitle('ACCESSIBILITY', 'Road Connectivity & Public Transport Spatial Access');
      renderAccessibility();
    } else if (navId === 'healthcare') {
      header.setTitle('HEALTHCARE', 'Medical Facilities & Bed Occupancy Diagnostic');
      renderHealthcare();
    } else if (navId === 'sustainability') {
      header.setTitle('ENVIRONMENT & ECOLOGICAL SENSITIVITY', 'Asset Proximity Diagnostic across Terrestrial & Marine Protected Reserves');
      renderSustainability();
    } else if (navId === 'destinations') {
      header.setTitle('DESTINATION READINESS & DIAGNOSTIC', 'Individual Attraction Location Readiness & Local Infrastructure Exposure');
      renderDestinations();
    }
  });

  // Instantiate modular Header component
  const header = new Header({
    titleProps: {
      initialTitle: 'NATIONAL OVERVIEW',
      initialSubtitle: 'Tourism Performance & State Capacity Diagnostic',
      onMenuToggle: () => {
        sidebar.toggleCollapse();
      },
    },
    actionProps: {
      initialDateRange: '1 Jan 2025 - 31 Dec 2025',
      onDateRangeClick: () => {
        console.log('Date range selector clicked');
      },
      onNotificationClick: () => {
        console.log('Notification bell clicked');
      },
      onAvatarClick: () => {
        console.log('Avatar profile clicked');
      },
      userInitial: 'T',
    },
  });

  // Instantiate modular Footer component
  const footer = new Footer({
    copyrightText: 'Tourisma © 2026',
    taglineText: 'Tourism Intelligence for a Better Tomorrow',
    dataAsOfText: 'Data as of Dec 2025',
  });

  // Right-hand content wrapper
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'content-wrapper';

  // Main content area for page views
  const mainContent = document.createElement('main');
  mainContent.id = 'main-content';
  mainContent.className = 'main-content';
  mainContent.setAttribute('role', 'main');

  // Render overview page
  const renderOverview = () => {
    mainContent.innerHTML = '';
    const overview = new OverviewPage();
    mainContent.appendChild(overview.element);
  };

  // Render tourism demand page
  const renderTourismDemand = () => {
    mainContent.innerHTML = '';
    const demandPage = new TourismDemandPage();
    mainContent.appendChild(demandPage.element);
  };

  // Render tourism assets page (empty)
  const renderTourismAssets = () => {
    mainContent.innerHTML = '';
    const assetsPage = new TourismAssetsPage();
    mainContent.appendChild(assetsPage.element);
  };

  // Render accommodation page (empty)
  const renderAccommodation = () => {
    mainContent.innerHTML = '';
    const accPage = new AccommodationPage();
    mainContent.appendChild(accPage.element);
  };

  // Render accessibility page (empty)
  const renderAccessibility = () => {
    mainContent.innerHTML = '';
    const accessPage = new AccessibilityPage();
    mainContent.appendChild(accessPage.element);
  };

  // Render healthcare page (empty)
  const renderHealthcare = () => {
    mainContent.innerHTML = '';
    const healthPage = new HealthcarePage();
    mainContent.appendChild(healthPage.element);
  };

  // Render sustainability page
  const renderSustainability = () => {
    mainContent.innerHTML = '';
    const susPage = new SustainabilityPage();
    mainContent.appendChild(susPage.element);
  };

  // Render destinations page
  const renderDestinations = () => {
    mainContent.innerHTML = '';
    const destPage = new DestinationsPage();
    mainContent.appendChild(destPage.element);
  };

  let activePressurePage: TourismPressurePage | null = null;

  // Render tourism pressure page
  const renderTourismPressure = () => {
    if (activePressurePage) {
      activePressurePage.destroy();
      activePressurePage = null;
    }
    mainContent.innerHTML = '';
    activePressurePage = new TourismPressurePage();
    mainContent.appendChild(activePressurePage.element);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  renderOverview();

  // Assemble content wrapper: Header on top, main canvas in middle, Footer at bottom
  contentWrapper.appendChild(header.element);
  contentWrapper.appendChild(mainContent);
  contentWrapper.appendChild(footer.element);

  // Assemble app layout
  appLayout.appendChild(sidebar.element);
  appLayout.appendChild(contentWrapper);

  appRoot.replaceChildren(appLayout);

  // Mount Decision Engine Chatbot icon at bottom-right corner
  const existingChatbot = document.querySelector('.hc-decision-engine-root');
  if (existingChatbot) {
    existingChatbot.remove();
  }
  const decisionEngine = new DecisionEngineChatbot();
  document.body.appendChild(decisionEngine.element);
}

// Initialize application
document.addEventListener('DOMContentLoaded', initializeApp);
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initializeApp();
}
