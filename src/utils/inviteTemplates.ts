// Beautiful pre-cooked designers invitation layouts for ForeverNote to replace boring emails!

export function getDefaultHtmlTemplate(inviteCode: string, sender: string, partner: string, templateType: string = 'ticket', appUrl: string = 'https://ai.studio/build'): string {
  const senderName = sender || "Your Partner";
  const partnerName = partner || "My Dearest";
  const code = inviteCode || "FN-PENDING";
  const baseUrl = appUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://ai.studio/build');
  const linkUrl = baseUrl.includes("?") ? `${baseUrl}&code=${code}` : `${baseUrl}?code=${code}`;

  switch (templateType) {
    case 'telegram':
      return `
<div style="font-family: 'Courier New', Courier, monospace, sans-serif; max-width: 580px; margin: 25px auto; padding: 35px; background-color: #fdfaf4; border: 4px double #8c7853; border-radius: 8px; box-shadow: 0 10px 25px rgba(140, 120, 83, 0.15); color: #3c3220; position: relative;">
  <!-- Vintage Header Seal -->
  <div style="border-bottom: 2px double #8c7853; padding-bottom: 15px; margin-bottom: 25px; text-align: center;">
    <div style="font-size: 11px; letter-spacing: 5px; color: #8c7853; font-weight: bold; margin-bottom: 5px;">★ GLOBAL DIRECT WIRE SERVICE ★</div>
    <h2 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 6px; color: #5a4b32; text-shadow: 1px 1px 1px rgba(0,0,0,0.05);">POSTAL TELEGRAM</h2>
    <div style="font-size: 9px; margin-top: 6px; opacity: 0.85; letter-spacing: 2px;">SECURE DIGITAL TRANSMISSION | PRIORITY PRESTIGE</div>
  </div>
  
  <!-- Telegram Meta Table -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 25px; font-size: 11px; line-height: 1.6; border-bottom: 1px dashed #8c7853; padding-bottom: 15px; color: #5a4b32;">
    <tr>
      <td width="50%" valign="top">
        <strong>SENDER:</strong> ${senderName.toUpperCase()}<br/>
        <strong>RECEIVER:</strong> ${partnerName.toUpperCase()}<br/>
        <strong>ORIGIN:</strong> FOREVERNOTE SANCTUARY
      </td>
      <td width="50%" valign="top" style="text-align: right;">
        <strong>WIRE NO:</strong> FN-${code.substring(0, 4)}<br/>
        <strong>DATE:</strong> ${new Date().toLocaleDateString()}<br/>
        <strong>STATUS:</strong> EXTREMELY URGENT 💖
      </td>
    </tr>
  </table>

  <!-- Typed Message body -->
  <div style="background-color: #faf6ee; border: 1px solid #eaddca; padding: 25px; border-radius: 4px; margin-bottom: 30px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.02);">
    <p style="font-size: 14.5px; line-height: 1.8; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; font-weight: bold; color: #4a3e2c;">
      DEAREST ${partnerName.toUpperCase()} STOP <br/><br/>
      
      FOUND OUR PRIVATE SECURE DIGITAL SANCTUARY REPEAT SECURE MEMORY SANCTUARY STOP <br/><br/>
      
      IT IS NAMED "FOREVERNOTE" - AN INTIMATE SHARED SPACE BUILT EXCLUSIVELY FOR THE TWO OF US TO ARCHIVE COUNTDOWNS, FLICKERING POLAROIDS, AND HIDDEN LOVE NOTES STOP <br/><br/>
      
      YOUR UNIQUE ENCRYPTED ACCESS CODE TO LOCK DASHBOARD TO MINE IS: <br/>
      <div style="text-align: center; margin: 20px 0;">
        <span style="background-color: #eaddca; padding: 8px 20px; border: 1px solid #c8b99f; border-radius: 4px; font-weight: 900; font-size: 22px; color: #5a4b32; letter-spacing: 4px; display: inline-block; box-shadow: 1px 2px 4px rgba(0,0,0,0.08);">${code}</span>
      </div>
      STOP PLEASE PRESS LINK BUTTON BELOW TO MERGE REALMS STOP CANNOT WAIT TO START WRITING COZY CHRONICLES STOP
    </p>
  </div>

  <!-- Premium CTA button -->
  <div style="text-align: center; margin: 30px 0 25px 0;">
    <a href="${linkUrl}" style="display: inline-block; padding: 14px 32px; background-color: #5a4b32; color: #fdfaf4; font-weight: bold; text-decoration: none; border-radius: 6px; letter-spacing: 3px; text-transform: uppercase; font-size: 13px; box-shadow: 0 4px 12px rgba(90,75,50,0.3); border: 1px solid #453926; transition: all 0.2s;">ENTER DISPATCH STATION ✉️</a>
    <div style="font-size: 10px; color: #8c7853; margin-top: 10px; letter-spacing: 1px;">(click to register/sign in and connect)</div>
  </div>

  <!-- Footer signature -->
  <div style="text-align: right; font-size: 10px; opacity: 0.75; margin-top: 30px; font-style: italic; border-top: 1px dashed #8c7853; padding-top: 15px; color: #5a4b32;">
    End of telegram wire. Signed under cosmic stars: <strong>${senderName}</strong>
  </div>
</div>
      `.trim();

    case 'scrapbook':
      return `
<div style="font-family: 'George', Georgia, 'Times New Roman', serif; max-width: 580px; margin: 25px auto; padding: 40px; background-color: #fdf7f9; border: 12px solid #ffe8f0; border-radius: 36px; box-shadow: 0 15px 35px rgba(219, 39, 119, 0.1); color: #4a3541; position: relative; overflow: hidden;">
  <!-- Premium Foil Sticker -->
  <div style="position: absolute; top: -5px; left: -5px; width: 120px; height: 120px; background-image: radial-gradient(circle, #fff3b3, #ffd27d); opacity: 0.15; border-radius: 50%; z-index: 1;"></div>
  
  <div style="position: absolute; top: 15px; left: -10px; background-color: #ffd27d; padding: 6px 22px; font-weight: bold; font-family: 'Courier New', monospace; font-size: 11px; transform: rotate(-12deg); box-shadow: 2px 3px 8px rgba(0,0,0,0.1); border-radius: 4px; color: #523a10; z-index: 5; letter-spacing: 1px;">
    ✨ SOUVENIR OF US
  </div>

  <div style="position: absolute; right: -30px; bottom: -30px; font-size: 200px; color: #ffe6ef; z-index: 1; opacity: 0.7;">🌹</div>

  <!-- Header Section -->
  <div style="text-align: center; margin-bottom: 30px; margin-top: 15px; position: relative; z-index: 2;">
    <span style="font-size: 38px;">📖</span>
    <h2 style="color: #db2777; margin: 8px 0 0 0; font-size: 26px; font-weight: bold; font-family: 'Georgia', serif; letter-spacing: -0.5px;">Our Secret Shared Scrapbook</h2>
    <p style="font-size: 13px; color: #a17088; margin: 4px 0 0 0; font-style: italic;">Made meticulously by ${senderName} for ${partnerName}</p>
  </div>

  <!-- Main Scrapbook Page Container -->
  <div style="background-color: #ffffff; padding: 30px; border-radius: 24px; border: 2px dashed #ffb6c1; position: relative; z-index: 2; box-shadow: 0 8px 20px rgba(219, 39, 119, 0.03);">
    <!-- Red Accent Corner Sticker -->
    <div style="position: absolute; top: -8px; right: 20px; background-color: #ff85a1; width: 50px; height: 16px; transform: rotate(15deg); opacity: 0.7; border-radius: 2px;"></div>
    
    <p style="font-size: 15.5px; line-height: 1.8; color: #5c4353; margin-top: 0; font-family: 'Georgia', serif;">
      Aww, hi <strong>${partnerName}</strong>! 💖 <br/><br/>
      I wanted a dedicated, cozy digital diary built entirely for the two of us. A place free of noise, where our cute milestones, love letters, and countdowns can live safely. So I built <strong>ForeverNote</strong>! 🏡
    </p>

    <h4 style="color: #db2777; margin: 25px 0 12px 0; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid #ffe3ed; padding-bottom: 6px;">🎁 Inside Our Cottage:</h4>
    
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 25px; font-size: 14px; color: #6e4e61; line-height: 1.8;">
      <tr>
        <td width="8%" valign="top">🌟</td>
        <td valign="top" style="padding-bottom: 8px;"><strong>Intimate Love Letters:</strong> Virtual envelope dropboxes full of heartfelt butterfly whispers.</td>
      </tr>
      <tr>
        <td width="8%" valign="top">📸</td>
        <td valign="top" style="padding-bottom: 8px;"><strong>Interactive Photo Board:</strong> A scrapbook panel to pin photos of our favorite memories.</td>
      </tr>
      <tr>
        <td width="8%" valign="top">⏳</td>
        <td valign="top"><strong>Stardust Countdown Clocks:</strong> Live ticking timers anticipating our special days.</td>
      </tr>
    </table>

    <!-- Beautiful Key Display -->
    <div style="margin-top: 20px; background: linear-gradient(135deg, #fff5f8, #ffffff); padding: 20px; border-radius: 18px; text-align: center; border: 1px solid #ffd1dc;">
      <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #db2777; font-weight: bold; display: block; margin-bottom: 8px;">👑 YOUR SECURE PAIRING CODE 👑</span>
      <span style="font-family: monospace, sans-serif; font-size: 22px; font-weight: bold; background-color: #ffffff; border: 2px solid #ffb6c1; padding: 6px 20px; border-radius: 12px; color: #db2777; display: inline-block; letter-spacing: 4px; box-shadow: 0 4px 10px rgba(219,39,119,0.08);">${code}</span>
      <div style="font-size: 11px; color: #b08299; margin-top: 8px;">(Copy paste this code to connect our hearts instantly!)</div>
    </div>
  </div>

  <!-- Premium CTA button -->
  <div style="text-align: center; margin-top: 30px; position: relative; z-index: 2;">
    <a href="${linkUrl}" style="display: inline-block; padding: 14px 35px; background: linear-gradient(to right, #db2777, #f43f5e); color: #ffffff; font-family: 'Georgia', serif; font-weight: bold; text-decoration: none; border-radius: 25px; font-size: 14.5px; box-shadow: 0 8px 20px rgba(219,39,119,0.25); text-shadow: 0 1px 2px rgba(0,0,0,0.15); border: none; transition: all 0.2s;">Open Our Scrapbook 💖</a>
    <div style="font-size: 11px; color: #a17088; margin-top: 12px; font-weight: bold; font-style: italic;">(drawing a bunch of beautiful red roses on your screen) xx</div>
  </div>
</div>
      `.trim();

    case 'cyber':
      return `
<div style="font-family: 'Courier New', Courier, monospace; max-width: 580px; margin: 25px auto; padding: 35px; background-color: #0b1528; border: 2px solid #14b8a6; border-radius: 20px; box-shadow: 0 12px 35px rgba(20,184,166,0.25); color: #99f6e4; position: relative; overflow: hidden;">
  <!-- Cyber Corner Elements -->
  <div style="position: absolute; top:0; left:0; width: 15px; height: 15px; border-top: 3px solid #14b8a6; border-left: 3px solid #14b8a6;"></div>
  <div style="position: absolute; top:0; right:0; width: 15px; height: 15px; border-top: 3px solid #14b8a6; border-right: 3px solid #14b8a6;"></div>
  <div style="position: absolute; bottom:0; left:0; width: 15px; height: 15px; border-bottom: 3px solid #14b8a6; border-left: 3px solid #14b8a6;"></div>
  <div style="position: absolute; bottom:0; right:0; width: 15px; height: 15px; border-bottom: 3px solid #14b8a6; border-right: 3px solid #14b8a6;"></div>

  <!-- Header section -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom: 1px solid #14b8a6; padding-bottom: 18px; margin-bottom: 25px;">
    <tr>
      <td>
        <span style="font-weight: 900; font-size: 19px; color: #2dd4bf; letter-spacing: 2px; display: block; text-shadow: 0 0 8px rgba(45,212,191,0.5);">🛰️ COSMIC_SANCTUARY_v6.4</span>
        <span style="font-size: 9px; opacity: 0.7; letter-spacing: 1.5px; text-transform: uppercase;">STARDUST COORDINATION PROTOCOL INSTALLED</span>
      </td>
      <td style="text-align: right;" valign="middle">
        <span style="font-family: monospace; font-size: 11px; color: #2dd4bf; border: 1px solid #2dd4bf; padding: 4px 8px; border-radius: 4px; background-color: rgba(45,212,191,0.15); box-shadow: 0 0 10px rgba(45,212,191,0.2);">SECURE PORT 3000</span>
      </td>
    </tr>
  </table>

  <!-- Transmission body -->
  <p style="font-size: 14px; line-height: 1.8; color: #ccfbf1; margin-top: 0;">
    <strong style="color: #2dd4bf;">&gt;&gt; INCOMING WARM TRANSMISSION FROM SENDER:</strong> <span style="background-color: rgba(45,212,191,0.2); padding: 2px 8px; border-radius: 4px; color: #fff;">${senderName}</span> <br/><br/>
    We have successfully established a private coordinates beacon on <strong>ForeverNote</strong>! This is our secure, private digital cockpit where the cozy memoirs of our heart and stellar milestones live out of reach of the noisy outer-net. Let's merge dashboards!
  </p>

  <!-- Digital features readout -->
  <div style="background-color: rgba(13,32,49,0.8); border: 1px dashed #0d9488; padding: 22px; border-radius: 12px; margin: 25px 0;">
    <span style="font-size: 10px; text-transform: uppercase; color: #14b8a6; display: block; margin-bottom: 12px; letter-spacing: 2px; font-weight: bold;">[ SYSTEM CAPABILITIES DEPLOYED ]</span>
    
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #99f6e4; line-height: 1.8;">
      <tr>
        <td width="10%" valign="top">💾</td>
        <td valign="top" style="padding-bottom: 8px;"><strong style="color: #2dd4bf;">Stardust Logs:</strong> Immutable archives of our precious milestones.</td>
      </tr>
      <tr>
        <td width="10%" valign="top">📡</td>
        <td valign="top" style="padding-bottom: 8px;"><strong style="color: #2dd4bf;">Active Frequency:</strong> Private real-time message boards just for us.</td>
      </tr>
      <tr>
        <td width="10%" valign="top">⏱️</td>
        <td valign="top"><strong style="color: #2dd4bf;">Light-Year Timers:</strong> Countdown beams tracking our upcoming meetings.</td>
      </tr>
    </table>

    <!-- Digital core key -->
    <div style="margin-top: 25px; text-align: center; border-top: 1px solid rgba(20,184,166,0.2); padding-top: 20px;">
      <span style="font-size: 11px; color: #2dd4bf; display: block; margin-bottom: 8px; letter-spacing: 2px;">COSMIC PORTAL ACCESS KEY:</span>
      <span style="font-size: 24px; font-weight: bold; background-color: #0b1528; border: 2px solid #14b8a6; padding: 6px 22px; border-radius: 8px; color: #2dd4bf; display: inline-block; letter-spacing: 4px; box-shadow: 0 0 15px rgba(20,184,166,0.25);">${code}</span>
    </div>
  </div>

  <!-- Interactive beam-in button -->
  <div style="text-align: center; margin-top: 30px;">
    <a href="${linkUrl}" style="display: inline-block; padding: 14px 30px; background-color: #14b8a6; color: #0b1528; font-weight: bold; text-decoration: none; border-radius: 8px; font-size: 13.5px; box-shadow: 0 0 20px rgba(20,184,166,0.4); text-transform: uppercase; letter-spacing: 2px; border: 1px solid #2dd4bf; transition: all 0.2s;">INITIALIZE BEAM-IN SEQUENCE 🌌</a>
  </div>

  <!-- Footer credentials -->
  <div style="margin-top: 35px; border-top: 1px solid rgba(20,184,166,0.2); padding-top: 15px; text-align: right; font-size: 9px; opacity: 0.6; letter-spacing: 1px;">
    SYSTEM COORDINATES: x82-y93-z01 | TIME-LOCK: ${new Date().toLocaleTimeString()}
  </div>
</div>
      `.trim();

    case 'ticket':
    default:
      return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 580px; margin: 25px auto; background-color: #ffffff; border-radius: 28px; box-shadow: 0 20px 45px rgba(219,39,119,0.18); border: 2px solid #ffd5e2; overflow: hidden; color: #1e293b;">
  <!-- Premium Ticket Header gradient -->
  <div style="background: linear-gradient(135deg, #e11d48, #be185d); padding: 25px 35px; color: white;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td>
          <h2 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">BOARDING PASS</h2>
          <span style="font-size: 11px; opacity: 0.9; letter-spacing: 1px;">DIRECT ESCAPE FLIGHT TO OUR COZY SANCTUARY</span>
        </td>
        <td style="text-align: right; font-size: 38px;" width="50" valign="middle">🎟️</td>
      </tr>
    </table>
  </div>

  <!-- Ticket Body -->
  <div style="padding: 35px; position: relative; background-color: #fffbfd;">
    <!-- Passenger Details table -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom: 1px solid #f3e8ee; padding-bottom: 20px; margin-bottom: 25px;">
      <tr>
        <td width="42%" valign="top">
          <span style="font-size: 9px; font-weight: bold; color: #a18c96; display: block; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">PASSENGER / DEAREST</span>
          <strong style="font-size: 17px; color: #0f172a;">${partnerName}</strong>
        </td>
        <td width="16%" style="text-align: center;" valign="middle">
          <span style="font-size: 22px; color: #e11d48;">✈️</span>
        </td>
        <td width="42%" style="text-align: right;" valign="top">
          <span style="font-size: 9px; font-weight: bold; color: #a18c96; display: block; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">CO-PILOT HOST</span>
          <strong style="font-size: 17px; color: #0f172a;">${senderName}</strong>
        </td>
      </tr>
    </table>

    <!-- Core Pitch -->
    <div style="text-align: center; margin: 30px 0;">
      <div style="font-size: 12px; text-transform: uppercase; color: #be185d; font-weight: 900; letter-spacing: 1.5px; margin-bottom: 10px;">
        💖 COZY PARADISE DEPARTED FOR: FOREVERNOTE 💖
      </div>
      <p style="font-size: 15px; line-height: 1.7; color: #475569; margin: 0 10px;">
        Hey love! I went ahead and booked us a VIP private suite inside <strong>ForeverNote</strong>. This is our secure private shared space to pin beautiful memories, countdown our special days, and share heart-stopping intimate love logs. Hurry up and pair your dashboard with mine!
      </p>
    </div>

    <!-- Smart horizontal pill badges for capability display -->
    <div style="text-align: center; margin: 25px 0;">
      <span style="background-color: #fce7f3; color: #be185d; font-size: 11px; font-weight: bold; padding: 6px 14px; border-radius: 20px; margin: 0 4px; display: inline-block;">🔑 Fully Private</span>
      <span style="background-color: #fef3c7; color: #b45309; font-size: 11px; font-weight: bold; padding: 6px 14px; border-radius: 20px; margin: 0 4px; display: inline-block;">📸 Photo Board</span>
      <span style="background-color: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: bold; padding: 6px 14px; border-radius: 20px; margin: 0 4px; display: inline-block;">⏱️ Live Timer</span>
    </div>

    <!-- Ticket Tear-off Cut Lines simulation -->
    <div style="height: 1px; border-top: 2px dashed #ffb6c1; margin: 30px -35px 30px -35px; position: relative;">
      <!-- Circles decoration on edges -->
      <span style="position: absolute; left: -12px; top: -11px; width: 22px; height: 22px; border-radius: 50%; background-color: #fbd6e2; border-right: 2px solid #ffd5e2;"></span>
      <span style="position: absolute; right: -12px; top: -11px; width: 22px; height: 22px; border-radius: 50%; background-color: #fbd6e2; border-left: 2px solid #ffd5e2;"></span>
    </div>

    <!-- Gate access coupon code box -->
    <div style="text-align: center; background-color: #fff8fa; border: 2px dashed #be185d; padding: 22px; border-radius: 20px; box-shadow: inset 0 2px 5px rgba(190,24,93,0.02);">
      <span style="font-size: 10px; text-transform: uppercase; color: #a18c96; letter-spacing: 2px; display: block; margin-bottom: 6px; font-weight: bold;">BOARDING GATE ACCESS COORDINATE CODE</span>
      <strong style="font-family: monospace, sans-serif; font-size: 26px; color: #be185d; letter-spacing: 5px; text-shadow: 1px 1px 0px rgba(0,0,0,0.02);">${code}</strong>
      <div style="font-size: 10px; color: #8c717e; margin-top: 6px;">(Simply copy this passcode and paste inside your pairing dashboard!)</div>
    </div>
  </div>

  <!-- Ticket Stub Footer with barcode and CTA button -->
  <div style="background-color: #fafbfc; border-top: 1px solid #f1f5f9; padding: 25px 35px; text-align: center;">
    <a href="${linkUrl}" style="display: inline-block; padding: 14px 35px; background: linear-gradient(135deg, #e11d48, #be185d); color: white; text-decoration: none; border-radius: 16px; font-weight: bold; font-size: 14px; box-shadow: 0 6px 15px rgba(225,29,72,0.3); border: none; transition: all 0.2s; text-transform: uppercase; letter-spacing: 1px;">CLAIM VIP FIRST-CLASS TICKET 🎟️</a>
    <div style="margin-top: 20px; opacity: 0.4; font-size: 9px; letter-spacing: 6px; font-weight: bold; font-family: monospace; color: #1e293b;">||| || | |||| || | | || | |||| || | || ||</div>
  </div>
</div>
      `.trim();
  }
}

