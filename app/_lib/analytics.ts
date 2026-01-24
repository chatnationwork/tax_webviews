import { v4 as uuidv4 } from 'uuid';

// Types based on API documentation
export interface AnalyticsEvent {
  event_id: string;
  event_name: string;
  event_type: 'page' | 'track' | 'identify';
  timestamp: string;
  anonymous_id: string;
  user_id?: string;
  session_id: string;
  context: {
    page: {
      path: string;
      title: string;
      url: string;
      referrer: string;
    };
    userAgent: string;
    library: {
      name: string;
      version: string;
    };
    [key: string]: any;
  };
  properties?: Record<string, any>;
}

export interface AnalyticsBatch {
  batch: AnalyticsEvent[];
  sent_at: string;
  write_key?: string;
}

class AnalyticsClient {
  private writeKey: string = '';
  private anonymousId: string = '';
  private sessionId: string = '';
  private userId: string | undefined;
  private endpoint: string = 'https://analytics.chatnationbot.com/v1/capture';
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initSession();
    }
  }

  public init(writeKey: string) {
    this.writeKey = writeKey;
    this.initialized = true;
    
    // Check for existing anonymousId or create new
    if (typeof window !== 'undefined') {
      let storedAnonId = localStorage.getItem('analytics_anonymous_id');
      if (!storedAnonId) {
        storedAnonId = uuidv4();
        localStorage.setItem('analytics_anonymous_id', storedAnonId);
      }
      this.anonymousId = storedAnonId;
      
      // Initialize session if not exists (30 min timeout logic could be added here, 
      // but for now we'll stick to a simple session per load/persisted)
      let storedSessionId = sessionStorage.getItem('analytics_session_id');
      if (!storedSessionId) {
        storedSessionId = uuidv4();
        sessionStorage.setItem('analytics_session_id', storedSessionId);
      }
      this.sessionId = storedSessionId;
    }
  }

  private initSession() {
      // Logic handled in init for now to ensure writeKey might be available if needed
      // but anonymousId and sessionId creation usually happens immediately on client load
  }

  public identify(userId: string, traits?: Record<string, any>) {
    this.userId = userId;
    // We could send an identify event here
    this.track('identify', traits, 'identify');
  }

  public page(name?: string, properties?: Record<string, any>) {
    if (typeof window === 'undefined') return;

    this.sendEvent({
      event_name: name || document.title,
      event_type: 'page',
      properties: properties
    });
  }

  public track(eventName: string, properties?: Record<string, any>, eventType: 'track' | 'identify' = 'track') {
    if (typeof window === 'undefined') return;

    this.sendEvent({
      event_name: eventName,
      event_type: eventType,
      properties: properties
    });
  }

  private async sendEvent(baseData: { event_name: string, event_type: 'page' | 'track' | 'identify', properties?: Record<string, any> }) {
    if (!this.initialized && !this.writeKey) {
        // Warn or silently fail? Silent fail for now or auto-init if env var exists
        console.warn('Analytics not initialized with write key');
        return;
    }

    const event: AnalyticsEvent = {
      event_id: uuidv4(),
      event_name: baseData.event_name,
      event_type: baseData.event_type,
      timestamp: new Date().toISOString(),
      anonymous_id: this.anonymousId,
      user_id: this.userId,
      session_id: this.sessionId,
      context: {
        page: {
          path: window.location.pathname,
          title: document.title,
          url: window.location.href,
          referrer: document.referrer
        },
        userAgent: navigator.userAgent,
        library: {
          name: 'f88-custom-analytics',
          version: '1.0.0'
        }
      },
      properties: baseData.properties
    };

    const batch: AnalyticsBatch = {
      batch: [event],
      sent_at: new Date().toISOString(),
      write_key: this.writeKey
    };

    try {
      // Use beacon if available for reliability on unload, otherwise fetch
      if (navigator.sendBeacon && baseData.event_type === 'track') { // sendBeacon usually for small payloads, simple usage
        // Beacon API doesn't support custom headers easily for X-Write-Key in some implementations, 
        // but our API supports write_key in body.
        const blob = new Blob([JSON.stringify(batch)], { type: 'application/json' });
        navigator.sendBeacon(this.endpoint, blob);
      } else {
        await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Write-Key': this.writeKey
          },
          body: JSON.stringify(batch)
        });
      }
    } catch (error) {
      console.error('Failed to send analytics event', error);
    }
  }
}

// Export singleton
export const analytics = new AnalyticsClient();
