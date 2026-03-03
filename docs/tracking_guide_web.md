# Web Tracking Guide

> **Audience**: Developers integrating the SDK into web applications.

---

## What This Powers

Sending these events will populate the following dashboard sections:

| Dashboard Section | What It Shows |
|:------------------|:--------------|
| **Overview** → Total Sessions | Session counts |
| **Overview** → Unique Users | Distinct user counts |
| **Overview** → Completion Rate | Conversion tracking |
| **Overview** → Daily Active Users | DAU chart |
| **Overview** → Traffic by Device | Mobile/Desktop/Tablet |
| **Overview** → Top Browsers | Browser breakdown |
| **Funnel** | Step-by-step journey analysis |
| **Sessions** | Session explorer & timeline |

---

## Required Events

### 1. Page Views
Fire on every page load.

```javascript
analytics.page();
```

**Auto-collected properties:**
- `path` - Page path
- `title` - Page title
- `url` - Full URL
- `referrer` - Referring URL

---

### 2. Session Start
Automatic with SDK init - no code needed.

```javascript
// Just initialize the SDK
analytics.init('YOUR_WRITE_KEY');
```

**What gets tracked:**
- `session_id` - Unique session identifier
- `anonymous_id` - Persistent device ID
- `device_type` - Mobile/Desktop/Tablet
- `browser_name` - Chrome/Safari/Firefox etc.
- `os_name` - iOS/Android/Windows etc.

---

### 3. User Identification
Call when user logs in or is identified.

```javascript
analytics.identify('user_12345', {
  email: 'user@example.com',
  name: 'John Doe',
  phone: '+254712345678',
  plan: 'premium'
});
```

**Required properties:** `userId` (first argument)  
**Optional traits:** Any user attributes

---

### 4. Custom Events (Track)
Fire for key user actions.

```javascript
analytics.track('button_click', {
  button_id: 'signup-cta',
  page: '/pricing'
});
```

---

## Recommended Events for Funnels

Track these events to power funnel analytics:

| Event Name | When to Fire | Key Properties |
|:-----------|:-------------|:---------------|
| `signup_started` | User begins signup | `source` |
| `signup_completed` | Signup successful | `method` (email/google) |
| `validation_success` | ID/PIN validated | `obligation_type` |
| `otp_verified` | OTP verified | `method` (sms/whatsapp) |
| `form_submitted` | Any form submission | `form_id` |
| `payment_initiated` | Payment started | `amount`, `currency` |
| `payment_success` | Payment completed | `transaction_id` |

---

## Campaign Funnel Events

Events fired across the WhatsApp campaign webview journey (`/campaign/*`):

| Event Name | Where Fired | Key Properties |
|:-----------|:------------|:---------------|
| `campaign_button_click` | Campaign hub (`/campaign`) — button tap | `button` (id of the button) |
| `campaign_page_view` | Each sub-page on mount | `page` (`why-contacted`, `pre-population`, `filing-options`) |
| `campaign_channel_click` | Filing Options — action link tap | `channel` (channel label), `page` |
| `campaign_survey_open` | Support page — "Take a Quick Survey" CTA | _(no extra props)_ |
| `campaign_survey_start` | Survey page on mount | `page` (`survey`) |
| `campaign_survey_answer` | PostSurvey — each answer | `question`, `value`, `phone` |
| `micro_feedback` | MicroFeedback widget — Yes/No tap | `pageId`, `helpful` (boolean) |
| `micro_feedback_reason` | MicroFeedback widget — reason tag tap | `pageId`, `reason` |

> **Note:** `setUserId(phone)` is called before each campaign track event so all events are
> linked to the user's phone number. The `AnalyticsProvider` also labels all campaign routes
> with the `'Campaign'` journey name in the automatic `page()` call.

---

## Implementation Checklist

- [x] SDK installed and initialized
- [x] `analytics.page()` on every route change (via `AnalyticsProvider`)
- [x] `analytics.identify()` / `setUserId()` after login/registration
- [x] Track key user actions with `analytics.track()`
- [x] Track conversion events for funnel analysis
- [x] Campaign funnel events wired across all `/campaign/*` pages
