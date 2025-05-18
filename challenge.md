# StrathSpace 2.0 QR Code Challenge: Concept & Implementation

## Core Features

1.  **Curiosity-Driven Engagement:**
    *   Utilizes a "breakup story" theme on flyers to pique student interest.
    *   The QR code promises to reveal "the tea" or "the pics."

2.  **Playful Landing Page:**
    *   Redirects users from the "drama" to a StrathSpace promotional message.
    *   Emphasizes finding their "own vibe" on the platform.
    *   Includes a clear call to action: sign up, create a profile, or share.
    *   Highlights an "Anonymous Mode" for privacy-conscious users.

3.  **Incentivized Participation (Prize Draw):**
    *   Offers tangible rewards (branded merch, cash) for engagement.
    *   Multiple ways to earn entries:
        *   Signing up/creating a profile.
        *   Sharing a referral link.
        *   Successful referrals (friend signs up).

4.  **Campus-Centric Vibe:**
    *   Tailored to Strathmore students, using campus-specific references and humor.
    *   Leverages Gen Z's interest in gossip, rewards, and social sharing.

5.  **Mobile-First Experience:**
    *   QR code scanning is inherently mobile.
    *   Landing page must be optimized for mobile devices.

6.  **Trackable Engagement (Optional but Recommended):**
    *   Dynamic QR codes allow for tracking scan rates.
    *   Referral links can track sharing and successful sign-ups for prize draw entries.

## Step-by-Step Implementation Plan

### 1. Craft the Breakup Flyer

*   **Content:**
    *   Develop a short, dramatic, and vague breakup message.
    *   Example: "Josh, you thought I wouldn't find those pics with that other girl? Guess what—I've got them, and EVERYONE will see! Don't EVER try to hurt me again. 💔 Scan to see the tea."
    *   Include a clear Call to Action (CTA): "Scan to see the drama!"
*   **Design:**
    *   Use tools like Canva or Figma.
    *   Employ bold colors (e.g., red/black) and Gen Z-friendly fonts (e.g., Comic Sans for irony, Poppins for clarity).
    *   Ensure the QR code is large and easily scannable.
    *   Target A5 or A4 paper size.
*   **Placement:**
    *   Print 50–100 flyers.
    *   Strategically post in high-traffic Strathclyde campus locations (e.g., Student Union, Strathmore Sport, Graham Hills Building, library).

### 2. Generate the QR Code

*   **Tool Selection:**
    *   Use a QR code generator that supports dynamic QR codes (e.g., Bitly, QR Code Monkey). This allows the destination URL to be changed without reprinting flyers.
*   **Link Destination:**
    *   The QR code will point to the custom landing page (e.g., `strathspace.com/challenge`).
*   **Customization:**
    *   Style the QR code with StrathSpace brand colors, if possible.
    *   Ensure high resolution for scannability.
    *   Test the QR code on multiple devices and QR scanner apps.

### 3. Build the Landing Page (`/challenge` route)

*   **Platform:**
    *   Develop as a new route within the existing Next.js StrathSpace website.
*   **Content & Tone:**
    *   Maintain a playful, on-brand voice.
    *   Reveal the "gotcha" moment and transition to the StrathSpace pitch.
    *   Example text: "Haha, gotcha! You're curious about spicy campus drama, but why not find your own vibe? Join StrathSpace 2.0, create a profile, or share this link with a friend for a chance to win epic merch or cash in our grand draw! 😎 #StrathSpace"
*   **Key Elements:**
    *   **"Sign Up" Button:** Links to the app download or web sign-up flow (with university email verification).
    *   **"Anonymous Mode" Highlight:** Explain or toggle this feature (e.g., "Join without showing your face!").
    *   **Shareable Link/Button:** Provides a unique link for users to share, enabling tracking for extra prize draw entries. Text example: "Invite a friend to StrathSpace for extra prize draw entries!"
    *   **Prize Details:** Clearly list the prizes (e.g., "Win StrathSpace hoodies, stickers, or £100 cash in our grand draw!").
    *   **Campus Visuals:** Incorporate images or memes relevant to Strathclyde campus life.
*   **Technical Considerations:**
    *   Ensure the page is fully responsive and mobile-friendly.

### 4. Set Up the Prize Draw

*   **Prizes:**
    *   Define attractive, student-friendly rewards.
    *   Examples:
        *   Grand Prize: £100 cash.
        *   Runner-Up Prizes: 2 x £50 cash.
        *   Merch Winners: 10 x StrathSpace hoodies or stickers.
*   **Entry Rules & Tracking:**
    *   **1 entry:** For signing up or creating a profile (anonymous or regular). (Requires tracking new sign-ups originating from the campaign).
    *   **2 extra entries:** For sharing the referral link. (Requires a system to generate and track unique referral links per user).
    *   **3 extra entries:** If a referred friend signs up using the shared link. (Requires tracking successful conversions from referral links).
*   **Winner Selection & Announcement:**
    *   Determine how winners will be randomly selected.
    *   Plan how and when winners will be announced (e.g., via email, on a specific date).
