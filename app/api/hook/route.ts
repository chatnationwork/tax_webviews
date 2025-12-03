import { NextRequest, NextResponse } from "next/server";

/**
 * GET handler for WhatsApp webhook verification
 * WhatsApp sends a verification request with hub.mode, hub.verify_token, and hub.challenge
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    // Get verify token from environment variables
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "your_verify_token_here";

    console.log("Webhook verification request received:", {
      mode,
      token,
      challenge: challenge ? "present" : "missing"
    });

    // Check if mode and token are valid
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified successfully");
      
      // Respond with the challenge token from the request
      return new NextResponse(challenge, { 
        status: 200,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    } else {
      console.error("Webhook verification failed:", {
        modeMatch: mode === "subscribe",
        tokenMatch: token === VERIFY_TOKEN
      });
      
      return NextResponse.json(
        { error: "Forbidden - Invalid verification token" },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error("Error during webhook verification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST handler for incoming WhatsApp messages
 * Processes webhook events from WhatsApp Business API
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("Incoming webhook event:", JSON.stringify(body, null, 2));

    // WhatsApp sends a test webhook with no entry
    if (!body.entry || body.entry.length === 0) {
      console.log("Empty webhook event received (likely a test)");
      return NextResponse.json({ message: "Success" }, { status: 200 });
    }

    // Process each entry in the webhook event
    for (const entry of body.entry) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value;

        // Check if this is a message event
        if (value?.messages && value.messages.length > 0) {
          for (const message of value.messages) {
            console.log("Processing message:", {
              from: message.from,
              type: message.type,
              timestamp: message.timestamp,
              id: message.id
            });

            // Extract message details based on type
            const messageData = {
              messageId: message.id,
              from: message.from,
              timestamp: message.timestamp,
              type: message.type,
              text: message.text?.body,
              image: message.image,
              document: message.document,
              audio: message.audio,
              video: message.video,
              location: message.location,
              contacts: message.contacts,
              interactive: message.interactive
            };

            console.log("Message data:", messageData);

            // TODO: Process the message here
            // You can add your business logic to handle different message types
            // For example:
            // - Store in database
            // - Trigger AI response
            // - Update conversation state
            // await processWhatsAppMessage(messageData);
          }
        }

        // Check for status updates (message delivery, read receipts, etc.)
        if (value?.statuses && value.statuses.length > 0) {
          for (const status of value.statuses) {
            console.log("Message status update:", {
              id: status.id,
              status: status.status,
              timestamp: status.timestamp,
              recipient_id: status.recipient_id
            });

            // TODO: Update message status in your database
            // await updateMessageStatus(status);
          }
        }
      }
    }

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    
    // Still return 200 to prevent WhatsApp from retrying
    // Log the error for debugging
    return NextResponse.json({ message: "Success" }, { status: 200 });
  }
}
