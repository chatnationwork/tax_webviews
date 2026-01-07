# Deployment Guide

This document outlines the steps to deploy the application and configure the necessary environment variables.

## Prerequisites

- Node.js (version 18 or later recommended)
- npm or yarn

## Environment Configuration

The application relies on specific environment variables to function correctly, particularly for the WhatsApp integration.

1.  **Create the Environment File**:
    Copy the example environment file to create your local `.env` file.
    ```bash
    cp env.example .env
    ```

2.  **Configure Variables**:
    Open the `.env` file and populate the following variables with your specific credentials.

    | Variable | Description | Example |
    | :--- | :--- | :--- |
    | `WHATSAPP_PHONE_NUMBER_ID` | The ID of your WhatsApp phone number from the Meta Business Suite. | `589622160904788` |
    | `WHATSAPP_ACCESS_TOKEN` | A valid system user access token with WhatsApp messaging permissions. | `EAA...` |
    | `NEXT_PUBLIC_WHATSAPP_NUMBER` | The WhatsApp number displayed in the UI (no spaces or `+`). | `254708427694` |

    > **Note:** Ensure your `WHATSAPP_ACCESS_TOKEN` is valid and has not expired. For production, use a permanent system user token.

## Deployment Steps

### 1. Install Dependencies

Install the project dependencies using npm:

```bash
npm install
```

### 2. Build the Application

Build the Next.js application for production:

```bash
npm run build
```

This command optimizes the application and prepares it for deployment.

### 3. Start the Server

Start the production server:

```bash
npm start
```

The application will typically run on port 3000 (or the port specified by your environment/provider).

## Troubleshooting

-   **WhatsApp Issues:** If WhatsApp features aren't working, verify that `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` are correct and that the token has the required permissions.
-   **UI Issues:** If the correct phone number isn't showing on the frontend, check `NEXT_PUBLIC_WHATSAPP_NUMBER`. Remember that `NEXT_PUBLIC_` variables are inlined at build time, so you may need to rebuild (`npm run build`) if you change this value.
