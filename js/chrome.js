/**
 * chrome.js — SugboCents App Shell Injector
 *
 * Dynamically injects the sidebar, resource-bar header, and mobile bottom
 * nav into every protected page so the layout HTML is maintained in one place.
 *
 * Requires the page to have:
 *   - <div id="appShell" class="lg:flex">  — the flex wrapper
 *   - <main id="mainContent" ...>          — main column (or <div id="mainContent"> for chat)
 *   - data-page="<pageName>" on <body>
 *
 * Must be loaded BEFORE app.js so that #sidebarAvatar / #sidebarName / #resourceBar
 * exist in the DOM when app.js runs.
 */
(function () {
  'use strict';

  /* ── Active-nav mappings ─────────────────────────────────────────────── */

  // Which sidebar link gets sidebar-new-link--active
  var SIDEBAR_ACTIVE = {
    dashboard:    'dashboard',
    quests:       'quests',
    leaderboard:  'leaderboard',
    profile:      'profile',
    achievements: 'profile',
    shop:         'profile',
    stats:        'profile',
    activity:     'activity',
    goals:        'goals',   // tigom.html uses data-page="goals"
    chat:         'chat'
  };

  // Which of the 5 mobile tabs gets the active highlight
  var MOBILE_ACTIVE = {
    dashboard:    'dashboard',
    quests:       'quests',
    leaderboard:  'leaderboard',
    profile:      'profile',
    achievements: 'profile',
    shop:         'profile',
    stats:        'profile',
    activity:     'activity',
    goals:        'activity',
    chat:         'activity',
    settings:     'activity'
  };

  var page        = (document.body.getAttribute('data-page') || '').toLowerCase();
  var sidebarKey  = SIDEBAR_ACTIVE[page] || '';
  var mobileKey   = MOBILE_ACTIVE[page]  || '';

  /* ── HTML-builder helpers ────────────────────────────────────────────── */

  function sidebarLink(href, navKey, icon, label, extra) {
    var cls = 'sidebar-new-link sidebar-nav-link' + (navKey === sidebarKey ? ' sidebar-new-link--active' : '');
    return (
      '<a href="' + href + '" data-nav="' + navKey + '" data-tooltip="' + label + '" class="' + cls + '">' +
      '<span class="sidebar-new-link__icon">' + icon + '</span>' +
      '<span class="nav-link-label">' + label + '</span>' +
      (extra || '') +
      '</a>'
    );
  }

  function mobileTab(href, navKey, icon, label) {
    var active = navKey === mobileKey;
    return (
      '<a href="' + href + '" data-nav="' + navKey + '"' +
      ' class="rounded-2xl px-2 py-2 text-center text-[0.68rem] font-black transition' + (active ? '' : ' hover:bg-white') + '"' +
      ' style="' + (active ? 'background:#164f33;color:white' : 'color:#607064') + ';text-decoration:none">' +
      '<span class="block text-lg leading-none">' + icon + '</span>' +
      '<span class="mt-1 block">' + label + '</span>' +
      '</a>'
    );
  }

  /* ── Sidebar HTML ────────────────────────────────────────────────────── */

  var sidebarHTML = [
    '<aside class="sc-sidebar sticky top-0 hidden h-screen w-72 shrink-0 flex-col lg:flex"',
    ' style="background:#f7f3e8;border-right:1px solid rgba(216,209,189,0.8)"',
    ' aria-label="Sidebar navigation">',

    // ── Inner scroll container ──
    '<div class="sc-sidebar-inner">',

    // ── Compact header row: mascot + wordmark + toggle button ──
    '<div class="sc-sidebar-header">',

    // Mascot icon — hero-card size, hidden when sidebar is collapsed (replaced by toggle button)
    '<a href="dashboard.html" class="sc-sidebar-logo" aria-label="SugboCents home" style="text-decoration:none;overflow:visible">',
    `<div id="mascot-img-sidebar" class="relative h-12 w-12 shrink-0" aria-hidden="true">
      <img src="icons/icon-512.png" alt="">
            </div>`,
    '</a>',

    // Wordmark — collapses with the sidebar via .nav-link-label transition
    '<a href="dashboard.html" class="sc-sidebar-wordmark nav-link-label" style="text-decoration:none">',
    '<span class="font-display font-black" style="color:#164f33;font-size:1.05rem;letter-spacing:-0.01em">SugboCents</span>',
    '</a>',

    // Toggle button — inline, right side of header row
    '<button id="sidebarToggle" class="sidebar-toggle-btn" type="button" aria-label="Toggle sidebar" title="Close sidebar">',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"',
    ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    '<rect x="3" y="3" width="18" height="18" rx="2"/>',
    '<path d="M9 3v18"/>',
    '</svg>',
    '</button>',

    '</div>', // end .sc-sidebar-header

    // ── Nav links ──
    '<nav class="mt-4 flex-1 space-y-1" aria-label="Main navigation">',
    sidebarLink('dashboard.html',   'dashboard',
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
      'Home'),
    sidebarLink('quests.html',      'quests',
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>',
      'Quests',
      '<span id="questNavBadgeSidebar" class="quest-nav-badge is-hidden"></span>'),
    sidebarLink('leaderboard.html', 'leaderboard',
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12v9a6 6 0 0 1-12 0z"/><path d="M6 5H3v4a3 3 0 0 0 3 3M18 5h3v4a3 3 0 0 1-3 3"/><path d="M12 17v4M9 21h6"/></svg>',
      'League'),
    sidebarLink('profile.html',     'profile',
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.31 3.58-6 8-6s8 2.69 8 6"/></svg>',
      'Profile'),
    sidebarLink('activity.html',    'activity',
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
      'Activity'),
    sidebarLink('tigom.html',       'goals',
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
      'Goals'),
    sidebarLink('chat.html',        'chat',
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
      'AI Chat'),

    '</nav>',

    // ── User strip ──
    '<a href="settings.html"',
    ' class="sc-user-strip mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 mx-2 transition hover:bg-white"',
    ' style="text-decoration:none">',
    '<div id="sidebarAvatar"',
    ' class="grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-sm font-black text-white"',
    ' style="background:#84919a">U</div>',
    '<div class="sidebar-user-info min-w-0 flex-1">',
    '<p id="sidebarName" class="truncate text-sm font-extrabold" style="color:#102b1d">Loading\u2026</p>',
    '<p class="text-xs font-semibold" style="color:#48625a">Account settings</p>',
    '</div>',
    '<span class="sidebar-user-arrow" style="color:#164f33">',
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    '</span>',
    '</a>',

    '</div>', // end .sc-sidebar-inner

    '</aside>'
  ].join('');

  /* ── Resource-bar header HTML ────────────────────────────────────────── */

  var headerHTML = [
    '<header class="sticky top-0 z-40 backdrop-blur-xl"',
    ' style="border-bottom:1px solid rgba(216,209,189,0.7);background:rgba(247,243,232,0.88);padding:0.75rem 1rem">',
    '<div class="mx-auto flex max-w-6xl items-center gap-3">',
    '<div class="hidden w-[9rem] shrink-0 lg:block">',
    '<p class="font-display text-lg font-extrabold tracking-tight" style="color:#164f33">SugboCents</p>',
    '<p class="text-xs font-semibold" style="color:#5f6f63">Habit finance game</p>',
    '</div>',
    '<div id="resourceBar" class="flex-1" aria-label="Your stats" style="min-height:4rem"></div>',
    '<button id="notifBellButton" class="notif-bell-btn is-hidden" type="button" aria-label="Open notifications">',
    '  <span aria-hidden="true">&#128276;</span>',
    '  <span id="notifBellBadge" class="notif-bell-badge is-hidden"></span>',
    '</button>',
    '</div>',
    '</header>'
  ].join('');

  /* ── Mobile bottom-nav HTML ──────────────────────────────────────────── */

  var mobileNavHTML = [
    '<nav class="fixed inset-x-0 bottom-0 z-40 border-t px-2 py-2 lg:hidden"',
    ' style="background:rgba(251,248,239,0.94);border-color:#d8d1bd;',
    '-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);',
    'padding-bottom:calc(0.5rem + env(safe-area-inset-bottom))"',
    ' aria-label="Main navigation">',
    '<div class="mx-auto grid max-w-md grid-cols-5 gap-1">',
    mobileTab('dashboard.html',   'dashboard',   '&#x2302;', 'Home'),
    mobileTab('quests.html',      'quests',      '&#9671;',  'Quests'),
    mobileTab('leaderboard.html', 'leaderboard', '&#9819;',  'League'),
    mobileTab('profile.html',     'profile',     '&#9689;',  'Profile'),
    mobileTab('activity.html',    'activity',    '&#8776;',  'More'),
    '</div>',
    '</nav>'
  ].join('');

  /* ── Injection ───────────────────────────────────────────────────────── */

  // 1. Prepend sidebar into the flex wrapper (before <main>)
  var shell = document.getElementById('appShell');
  if (shell) {
    shell.insertAdjacentHTML('afterbegin', sidebarHTML);
  }

  // 2. Prepend resource-bar header inside the main content column
  var mainContent = document.getElementById('mainContent');
  if (mainContent) {
    mainContent.insertAdjacentHTML('afterbegin', headerHTML);
  }

  // 3. Append mobile nav at end of body
  document.body.insertAdjacentHTML('beforeend', mobileNavHTML);

}());
