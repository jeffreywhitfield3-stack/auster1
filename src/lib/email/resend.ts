// Resend email service client
// Documentation: https://resend.com/docs

import { Resend } from "resend";

// Use a dummy key during build time, real key required at runtime
const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_placeholder_key_for_build";

export const resend = new Resend(RESEND_API_KEY);

// Runtime validation function
export function validateResendKey() {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_placeholder_key_for_build") {
    throw new Error("Missing RESEND_API_KEY environment variable. Please configure it in your environment.");
  }
}

// Email configuration
export const EMAIL_CONFIG = {
  from: "Austerian Research <research@austerian.com>", // Update with your verified domain
  replyTo: "support@austerian.com",
  weeklyBriefSubjectPrefix: "Weekly Market Brief:",
  tradeAlertSubjectPrefix: "🚨 Trade Alert:",
  researchUpdateSubjectPrefix: "📊 New Research:",
} as const;

// Email templates
export const EMAIL_TEMPLATES = {
  // Default template wrapper
  layout: (content: string) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Austerian Research</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9fafb;
        }
        .header {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          padding: 30px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }
        .content {
          background: white;
          padding: 30px;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: #3b82f6;
          color: white !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .button:hover {
          background: #2563eb;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #6b7280;
          font-size: 14px;
        }
        .footer a {
          color: #3b82f6;
          text-decoration: none;
        }
        .trade-idea {
          background: #f0f9ff;
          border-left: 4px solid #3b82f6;
          padding: 15px;
          margin: 15px 0;
          border-radius: 4px;
        }
        .event {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 15px 0;
          border-radius: 4px;
        }
        .stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin: 15px 0;
        }
        .stat {
          background: #f3f4f6;
          padding: 10px;
          border-radius: 4px;
          text-align: center;
        }
        .stat-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
        }
        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏛️ Austerian Research</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>
          <a href="{{unsubscribeUrl}}">Unsubscribe</a> |
          <a href="{{preferencesUrl}}">Email Preferences</a> |
          <a href="https://austerian.com">Visit Austerian</a>
        </p>
        <p>© ${new Date().getFullYear()} Austerian. All rights reserved.</p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
          This email was sent to {{email}}. Not investment advice. Trading involves risk.
        </p>
      </div>
    </body>
    </html>
  `,

  // Weekly brief email template
  weeklyBrief: (data: {
    title: string;
    summary: string;
    tradeIdeas: Array<{
      symbol: string;
      strategy: string;
      thesis: string;
      maxProfit?: number;
      maxLoss?: number;
    }>;
    economicEvents: Array<{
      name: string;
      date: string;
      importance: string;
      impact: string;
    }>;
    briefUrl: string;
  }) => `
    <h2>${data.title}</h2>
    <p style="font-size: 16px; color: #4b5563; margin: 20px 0;">
      ${data.summary}
    </p>

    ${
      data.tradeIdeas.length > 0
        ? `
    <h3>🎯 Top Trade Ideas This Week</h3>
    ${data.tradeIdeas
      .map(
        (idea) => `
      <div class="trade-idea">
        <h4 style="margin: 0 0 8px 0; color: #1f2937;">
          ${idea.symbol} - ${idea.strategy}
        </h4>
        <p style="margin: 8px 0; font-size: 14px;">
          ${idea.thesis}
        </p>
        ${
          idea.maxProfit && idea.maxLoss
            ? `
        <div class="stats">
          <div class="stat">
            <div class="stat-label">Max Profit</div>
            <div class="stat-value" style="color: #10b981;">$${idea.maxProfit.toFixed(2)}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Max Loss</div>
            <div class="stat-value" style="color: #ef4444;">$${idea.maxLoss.toFixed(2)}</div>
          </div>
        </div>
        `
            : ""
        }
      </div>
    `
      )
      .join("")}
    `
        : ""
    }

    ${
      data.economicEvents.length > 0
        ? `
    <h3>📅 Key Events This Week</h3>
    ${data.economicEvents
      .map(
        (event) => `
      <div class="event">
        <h4 style="margin: 0 0 8px 0; color: #1f2937;">
          ${event.name}
          <span style="font-size: 12px; background: #fbbf24; color: #78350f; padding: 2px 8px; border-radius: 4px; margin-left: 8px;">
            ${event.importance.toUpperCase()}
          </span>
        </h4>
        <p style="margin: 4px 0; font-size: 13px; color: #6b7280;">
          ${event.date}
        </p>
        <p style="margin: 8px 0; font-size: 14px;">
          ${event.impact}
        </p>
      </div>
    `
      )
      .join("")}
    `
        : ""
    }

    <p style="margin: 30px 0 20px 0; font-size: 14px; color: #6b7280;">
      This is just a preview. Read the full analysis with interactive charts,
      Greeks data, backtests, and risk graphs on the site.
    </p>

    <a href="${data.briefUrl}" class="button">
      Read Full Analysis →
    </a>

    <p style="font-size: 13px; color: #9ca3af; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      💡 <strong>Pro Tip:</strong> Use our Derivatives Lab to analyze these trades
      with live Greeks, risk graphs, and backtesting before entering positions.
    </p>
  `,

  // Welcome email template
  welcome: (data: { firstName?: string }) => `
    <h2>Welcome to Austerian Research! 🎉</h2>
    <p style="font-size: 16px;">
      ${data.firstName ? `Hi ${data.firstName},` : "Hi there,"}
    </p>
    <p style="font-size: 16px; line-height: 1.8;">
      Thanks for subscribing to our weekly market briefs. Every week, you'll receive:
    </p>
    <ul style="font-size: 16px; line-height: 1.8;">
      <li><strong>Top Trade Ideas</strong> - AI-analyzed options strategies with risk/reward profiles</li>
      <li><strong>Economic Calendar</strong> - Key events that will move markets</li>
      <li><strong>Market Positioning</strong> - Insights from options flow and open interest</li>
      <li><strong>Volatility Analysis</strong> - Term structure and IV rank opportunities</li>
    </ul>
    <p style="font-size: 16px;">
      All briefs include full access to our interactive tools:
    </p>
    <ul style="font-size: 15px;">
      <li>📊 Greeks calculators and tooltips</li>
      <li>📈 Risk graphs (P&L curves)</li>
      <li>🔍 Open Interest heatmaps</li>
      <li>🧪 Monte Carlo backtesting</li>
      <li>🛡️ Auto-hedging recommendations</li>
    </ul>
    <a href="https://austerian.com/research" class="button">
      Explore Research →
    </a>
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      Your first brief will arrive this Sunday at 6 PM ET.
    </p>
  `,

  // Trade alert template
  tradeAlert: (data: {
    symbol: string;
    alertType: string;
    condition: string;
    currentValue: number;
    threshold: number;
  }) => `
    <h2>🚨 Trade Alert: ${data.symbol}</h2>
    <p style="font-size: 16px;">
      <strong>${data.alertType}</strong> has triggered your alert condition.
    </p>
    <div class="trade-idea">
      <p style="margin: 0; font-size: 15px;">
        <strong>Condition:</strong> ${data.condition}
      </p>
      <p style="margin: 8px 0 0 0; font-size: 15px;">
        <strong>Current Value:</strong> ${data.currentValue}
      </p>
      <p style="margin: 8px 0 0 0; font-size: 15px;">
        <strong>Your Threshold:</strong> ${data.threshold}
      </p>
    </div>
    <a href="https://austerian.com/derivatives?symbol=${data.symbol}" class="button">
      Analyze ${data.symbol} →
    </a>
  `,
} as const;

// Helper to replace template variables
export function replaceTemplateVars(
  html: string,
  vars: Record<string, string>
): string {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result;
}
