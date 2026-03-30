import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AnalyticsProvider } from "@/app/_components/AnalyticsProvider";
import MobileGuard from "@/app/_components/MobileGuard";
import { ConfigProvider, type RuntimeConfig } from "@/app/_lib/runtime-config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "eTIMS",
  description: "eTIMS",
};

function getRuntimeConfig(): RuntimeConfig {
  return {
    whatsappNumber: process.env.WHATSAPP_NUMBER,
    analyticsEndpoint: process.env.ANALYTICS_ENDPOINT,
    analyticsWriteKey: process.env.ANALYTICS_WRITE_KEY,
    allowDesktopTesting: process.env.ALLOW_DESKTOP_TESTING === 'true',
    services: {
      "Sales Invoice": process.env.SERVICE_SALES_INVOICE,
      "Credit Note": process.env.SERVICE_CREDIT_NOTE,
      "Buyer-Initiated Invoices": process.env.SERVICE_BUYER_INITIATED_INVOICES,
      "NIL Filing": process.env.SERVICE_NIL_FILING,
      "MRI": process.env.SERVICE_MRI,
      "TOT": process.env.SERVICE_TOT,
      "ITR": process.env.SERVICE_ITR,
      "PIN Registration": process.env.SERVICE_PIN_REGISTRATION,
      "eSlip": process.env.SERVICE_ESLIP,
      "NITA": process.env.SERVICE_NITA,
      "AHL": process.env.SERVICE_AHL,
      "TCC Application": process.env.SERVICE_TCC_APPLICATION,
      "PIN Retrieve": process.env.SERVICE_PIN_RETRIEVE,
      "PIN Check": process.env.SERVICE_PIN_CHECK,
      "Staff Check": process.env.SERVICE_STAFF_CHECK,
      "Station": process.env.SERVICE_STATION,
      "Import Check": process.env.SERVICE_IMPORT_CHECK,
      "Payroll": process.env.SERVICE_PAYROLL,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = getRuntimeConfig();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConfigProvider config={config}>
          <AnalyticsProvider>
            <MobileGuard>
              {children}
            </MobileGuard>
          </AnalyticsProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
