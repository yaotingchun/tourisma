import { createElement, Calendar, ChevronDown, Bell } from 'lucide';

export interface HeaderActionsProps {
  initialDateRange?: string;
  onDateRangeClick?: () => void;
  onNotificationClick?: () => void;
  onAvatarClick?: () => void;
  userInitial?: string;
}

export class HeaderActions {
  public readonly element: HTMLElement;
  private readonly dateRangeText: HTMLSpanElement;

  constructor(props: HeaderActionsProps = {}) {
    const {
      initialDateRange = '1 Jan 2025 - 31 Dec 2025',
      onDateRangeClick,
      onNotificationClick,
      onAvatarClick,
      userInitial = 'T',
    } = props;

    this.element = document.createElement('div');
    this.element.className = 'header-actions';

    // 1. Date Range Button
    const dateRangeBtn = document.createElement('button');
    dateRangeBtn.type = 'button';
    dateRangeBtn.className = 'header-btn date-range-btn';
    dateRangeBtn.setAttribute('aria-label', `Select date range, currently ${initialDateRange}`);

    const calendarIcon = createElement(Calendar, {
      class: 'header-btn-icon',
      width: 15,
      height: 15,
      'stroke-width': 2,
    });

    this.dateRangeText = document.createElement('span');
    this.dateRangeText.textContent = initialDateRange;

    const chevronIcon = createElement(ChevronDown, {
      class: 'header-chevron-icon',
      width: 13,
      height: 13,
      'stroke-width': 2.2,
    });

    dateRangeBtn.appendChild(calendarIcon);
    dateRangeBtn.appendChild(this.dateRangeText);
    dateRangeBtn.appendChild(chevronIcon);

    if (onDateRangeClick) {
      dateRangeBtn.addEventListener('click', onDateRangeClick);
    }

    // 2. Notification Bell Button
    const notificationBtn = document.createElement('button');
    notificationBtn.type = 'button';
    notificationBtn.className = 'header-icon-btn notification-btn';
    notificationBtn.setAttribute('aria-label', 'View notifications');

    const bellIcon = createElement(Bell, {
      class: 'header-bell-icon',
      width: 19,
      height: 19,
      'stroke-width': 2,
    });

    const notificationDot = document.createElement('span');
    notificationDot.className = 'notification-dot';
    notificationDot.setAttribute('aria-hidden', 'true');

    notificationBtn.appendChild(bellIcon);
    notificationBtn.appendChild(notificationDot);

    if (onNotificationClick) {
      notificationBtn.addEventListener('click', onNotificationClick);
    }

    // 3. User Avatar Button
    const avatarBtn = document.createElement('button');
    avatarBtn.type = 'button';
    avatarBtn.className = 'header-avatar-btn';
    avatarBtn.setAttribute('aria-label', 'User account menu');

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'header-avatar';
    avatarDiv.textContent = userInitial;

    avatarBtn.appendChild(avatarDiv);

    if (onAvatarClick) {
      avatarBtn.addEventListener('click', onAvatarClick);
    }

    // Assemble right action group
    this.element.appendChild(dateRangeBtn);
    this.element.appendChild(notificationBtn);
    this.element.appendChild(avatarBtn);
  }

  public setDateRange(newDateRange: string): void {
    this.dateRangeText.textContent = newDateRange;
  }
}
