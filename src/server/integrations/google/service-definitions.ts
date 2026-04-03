export type GoogleServiceAlias =
  | 'gmail'
  | 'calendar'
  | 'google_calendar'
  | 'sheets'
  | 'google_sheets'
  | 'drive'
  | 'google_drive'
  | 'google_analytics'
  | 'search_console'
  | 'google_search_console'
  | 'exec_calendar'
  | 'google_workspace';

export type GoogleOAuthService =
  | 'gmail'
  | 'calendar'
  | 'sheets'
  | 'drive'
  | 'google_analytics'
  | 'google_search_console'
  | 'exec_calendar'
  | 'google_workspace';

const GOOGLE_SERVICE_ALIASES: Record<GoogleServiceAlias, GoogleOAuthService> = {
  gmail: 'gmail',
  calendar: 'calendar',
  google_calendar: 'calendar',
  sheets: 'sheets',
  google_sheets: 'sheets',
  drive: 'drive',
  google_drive: 'drive',
  google_analytics: 'google_analytics',
  search_console: 'google_search_console',
  google_search_console: 'google_search_console',
  exec_calendar: 'exec_calendar',
  google_workspace: 'google_workspace',
};

export const GOOGLE_SERVICE_SCOPES: Record<GoogleOAuthService, string[]> = {
  gmail: [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ],
  calendar: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.email',
  ],
  sheets: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
  ],
  drive: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
  ],
  google_analytics: [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ],
  google_search_console: [
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ],
  exec_calendar: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.email',
  ],
  // Org-scoped Workspace — send + read verified Send As aliases
  google_workspace: [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.settings.basic',
    'https://www.googleapis.com/auth/userinfo.email',
  ],
};

export function normalizeGoogleService(service: string | null | undefined): GoogleOAuthService {
  if (!service) {
    return 'gmail';
  }

  return GOOGLE_SERVICE_ALIASES[service as GoogleServiceAlias] || 'gmail';
}

export function getGoogleSuccessKey(service: GoogleOAuthService): string {
  return service;
}
