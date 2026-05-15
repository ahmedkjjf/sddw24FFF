import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Discord Config & Rotating Code
  const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "https://discord.com/api/webhooks/1504798977013317723/HXvs0NSA3_wmZkjpEkwqC9FHVOMfPQirx_OEfrysCUclADw3TllCrRmiQI2pYjhFQdOL";
  let currentAdminCode = "";
  let lastTimeBlock = -1;
  let lastSentCode = "";
  let isMaintenanceMode = false;

  async function sendToDiscord(code: string) {
    if (code === lastSentCode) return;
    lastSentCode = code;
    
    try {
      await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: "🛡️ ALZAABI QUANTUM SECURITY SYNC",
            description: `**ENCRYPTION LEVEL:** AES-256-GCM / SHA-40-BLOCK\n\n**RAW ACCESS KEY:**\n\`\`\`\n${code}\n\`\`\`\n\n**STATUS:** ROTATING_READY\n**EXPIRY:** 30 Minutes\n**NODE:** NEURAL_SERVER_V5_STABLE`,
            color: 0x00ff00,
            timestamp: new Date().toISOString(),
            footer: { text: "System Kernel Integrity: 100% Verified" }
          }]
        }),
      });
      console.log("Security key synced to Discord.");
    } catch (err) {
      console.error("Failed to sync code:", err);
    }
  }

  function rotateCode() {
    const timeBlock = Math.floor(Date.now() / (30 * 60 * 1000));
    if (timeBlock !== lastTimeBlock) {
      lastTimeBlock = timeBlock;
      // Generate an 40-character complex "encrypted" string
      const fullCharset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+=-[]{}|;:,.<>?";
      let code = "";
      for (let i = 0; i < 40; i++) {
        code += fullCharset.charAt(Math.floor(Math.random() * fullCharset.length));
      }
      currentAdminCode = code;
      sendToDiscord(currentAdminCode);
    }
  }

  setInterval(rotateCode, 10000); // Check every 10s instead of 60s for responsiveness, but helper prevents double-send
  rotateCode();

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", maintenance: isMaintenanceMode });
  });

  app.post("/api/admin/maintenance", (req, res) => {
    const { code, enabled } = req.body;
    if (code === currentAdminCode) {
      isMaintenanceMode = enabled;
      return res.json({ success: true, maintenance: isMaintenanceMode });
    }
    res.status(401).json({ success: false });
  });

  app.get("/api/intel", (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    res.json({ ip });
  });

  app.post("/api/admin/verify", (req, res) => {
    const { code } = req.body;
    if (code === currentAdminCode) {
      // In a real app, generate a JWT. For this, we'll return success.
      return res.json({ success: true, token: "alzaabi_root_v5_" + Date.now() });
    }
    res.status(401).json({ success: false, message: "INVALID_SECURITY_CODE" });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
