import { NextRequest, NextResponse } from "next/server";
import * as path from "path";
import * as fs from "fs";
import { exec, spawn } from "child_process";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phoneNumbers, blocks } = body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid or empty phoneNumbers list." },
        { status: 400 }
      );
    }

    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid or empty message blocks list." },
        { status: 400 }
      );
    }

    // Resolve the paths dynamically
    const automationDir = path.resolve(process.cwd(), "../lead-management-system-automation");
    const payloadPath = path.join(automationDir, "broadcast_payload.json");

    console.log(`Writing broadcast payload to: ${payloadPath}`);
    
    // Save payload to JSON
    fs.writeFileSync(payloadPath, JSON.stringify({ phoneNumbers, blocks }, null, 2), "utf8");

    // Spawn Playwright script in the background
    console.log(`Triggering Playwright broadcast in directory: ${automationDir}`);
    
    // Run the playwright script asynchronously
    const playProcess = spawn("npx", ["playwright", "test", "tests/broadcast.spec.ts", "--headed"], {
      cwd: automationDir,
      shell: true,
      detached: true,
      stdio: "ignore", // Let it run independently
    });

    playProcess.unref();

    return NextResponse.json({
      success: true,
      message: `Broadcast successfully queued and triggered for ${phoneNumbers.length} recipients. Check the opened browser window on the desktop.`,
    });
  } catch (error) {
    console.error("Error triggering broadcast:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to trigger broadcast",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
