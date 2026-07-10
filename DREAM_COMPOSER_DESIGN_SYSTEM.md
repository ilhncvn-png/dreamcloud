# DreamCloud — Dream Composer Design System

> DreamCloud is not a form. It is a ritual.
> The user does not answer questions. The user enters their subconscious.
> Every screen must feel: soft, alive, emotional, mysterious.

---

## 1. Philosophy

### One Screen = One Ritual Moment

Each screen has exactly:

- **One emotional object** — the thing the user feels
- **One interaction** — the thing the user does
- **One decision** — the thing the user confirms

Never mix interaction styles on a single screen.
Never show a list where an orbit can be used.
Never show a card where a particle can speak.

### Voice Is Primary

The first touchpoint is always voice.
Text and image are secondary methods — visually subordinate.
The microphone is the entry point to the subconscious.

### AI Is Visible

Analysis is never instant. It breathes.
The user must watch their dream being interpreted.
Particles carry symbols outward. Emotions crystallize.

### Collective Is Always Present

Every screen shows the user they are not alone.
Numbers of people. Resonance lines. Shared emotions.
DreamCloud is a subconscious network, not a diary.

---

## 2. Color System

```
Background (deep void)      #04030F
Surface (elevated)          #06051A
Surface (interactive)       #0A0820
Border (default)            rgba(255,255,255,0.07)
Border (active)             rgba(108,99,255,0.60)
Border (glow)               rgba(167,139,250,0.35)

Primary violet              #6C63FF
Primary violet dim          rgba(108,99,255,0.35)
Accent lavender             #A78BFA
Accent lavender dim         rgba(167,139,250,0.40)
Accent soft                 #C4B5FD

Text primary                rgba(255,255,255,0.94)
Text secondary              rgba(255,255,255,0.52)
Text tertiary               rgba(255,255,255,0.22)
Text ghost                  rgba(255,255,255,0.09)

Emotion colors (override ambient):
  Fear / Anxiety            #EF4444
  Wonder / Curiosity        #A78BFA
  Longing                   #C084FC
  Peace                     #60A5FA
  Joy                       #FBBF24
  Intensity                 #F87171
```

### Ambient Color Rule

The dominant selected emotion always tints the ambient orb (top-left background blob).
Default when no emotion is selected: `#6C63FF`.

---

## 3. Spacing

```
Screen horizontal padding   24px
Screen top padding          4px  (below NavBar)
Screen bottom padding       20px (above ContinueBtn)
Section gap (large)         32px
Section gap (medium)        22px
Section gap (small)         12px
Item gap                    8–10px
Chip internal h-pad         14–16px
Chip internal v-pad         8–10px
Card internal padding       16–18px
```

---

## 4. Typography

```
Hero title (screen name)    44px / weight 900 / tracking -1.5
Section title               29–32px / weight 900 / tracking -0.5
Card title                  16–18px / weight 900 / tracking -0.2
Body                        14–15px / weight 300–400 / line-height 22–24
Caption / label             8.5–11px / weight 900 / tracking 2.0+  (UPPERCASE)
Ghost text                  12–13px / italic / weight 300–400
```

**Labels are always UPPERCASE with 2+ letter-spacing.**
**Hero text never has labels above it.** The title IS the statement.

---

## 5. Visual System

DreamCloud uses four and only four visual primitives.

### 5.1 Orbital System

```
Field size          300 × 300px
Center point        (150, 150)
Orbit radius        108px
Node size           62px diameter

Arm rotation:       Animated.loop(timing(0→1, linear))
Counter-rotation:   Applied to inner content so text stays upright
Speeds:
  Idle (unselected)  36,000ms per revolution
  Active (selected)   9,000ms per revolution

Selection spring:   speed 30, bounciness 6, toValue 1.16
Deselect spring:    speed 30, bounciness 6, toValue 1.00
Press-in scale:     0.88 (speed 60)
Press-out scale:    restore (speed 60)
```

### 5.2 Particles

Two particle layers exist at module level (stable refs, never remounted):

**Background Stars** — 24 stars, always visible on all screens

```
Size:           1 – 2px
Color:          #C4B5FD
Opacity range:  0.05 → 0.90 (loop, sine easing)
Duration:       2,200 – 5,000ms per cycle (per star)
Position:       Deterministic (seeded, not random on mount)
```

**Ritual Particles** — 26 particles, visible during AI analysis + final screen

```
Size:           1.5 – 4.5px
Colors:         #A78BFA, #6C63FF, #C4B5FD, #818CF8, #60A5FA
Travel:         bottom 18% of screen → 80% upward (translateY)
Opacity arc:    0 → 0.85 → 0.65 → 0 (fade out near top)
Duration:       7,000 – 15,000ms
Loop delay:     0 – 4,000ms stagger
```

**Orbital Particles** — 3 particles around emotion orbit center

```
Radius:         108px (ORB_R)
Sizes:          5px, 4px, 3px
Start angles:   0°, 120°, 240°
Durations:      10,000ms, 14,500ms, 18,000ms
Trigger:        Fade in when 2+ emotions selected
Opacity:        0.65, 0.55, 0.45
```

### 5.3 Breathing Circles

Used for: ambient background, mic idle, center pulse, loading orb.

```
Scale range:    0.88 → 1.12  (outer glow)
               1.00 → 1.18  (idle mic ring)
Opacity range:  Low 0.04–0.10 (ambient), High 0.22–0.55 (orb)
Easing:         Easing.inOut(Easing.sin)
Duration:       2,500ms – 13,500ms (slower = calmer)
Never use:      Easing.linear for breathing (use sine only)
```

**Ambient background rule:**

- Top-left orb: 55% screen width, color = dominant emotion color
- Bottom-right orb: 42% screen width, color = #4338CA (always)
- Both breathe independently at different speeds

### 5.4 Resonance Lines

Used for: symbol connections.

```
Source:         Midpoint between two selected symbol centers
Width:          Dynamic (distance between chips)
Height:         1px
Color:          rgba(167,139,250,0.28)
Rotation:       Math.atan2(dy, dx) * 180 / Math.PI
Mount animation: opacity 0 → 1, duration 480ms, Easing.out(Easing.cubic)
Key:            `${indexA}-${indexB}` (pair-based, not name-based)
```

---

## 6. Animation Rules

### Transition Between Screens

```
Exit:   opacity 1→0, translateY 0→±16,  150ms, Easing.out(Easing.cubic)
Enter:  opacity 0→1, translateY ∓16→0,  300ms, Easing.out(Easing.cubic)
Gap:    setState fires between exit and enter
Direction: forward = slide up (-16 exit, +16 enter entry offset)
           backward = slide down (+16 exit, -16 enter entry offset)
```

### Selection Feedback

```
Scale spring on select:   toValue 1.06–1.16, speed 35, bounciness 5–8
Scale spring on deselect: toValue 1.00, speed 35, bounciness 5–8
Press in:                 toValue 0.88–0.91, speed 60 (instant feel)
Press out:                restore to current state, speed 60
Haptic on select:         ImpactFeedbackStyle.Light
Haptic on voice start:    ImpactFeedbackStyle.Heavy
Haptic on submit done:    NotificationFeedbackType.Success
```

### Reveal Animations

```
Cards / text reveal:  opacity 0→1 + translateY 14→0
Duration:             360–700ms
Easing:               Easing.out(Easing.cubic)
Stagger (sentences):  300ms, 850ms, 1400ms
Auto-dismiss cards:   2,600ms timeout
```

### Loading / AI Analysis

```
Orb pulse:      scale 0.88→1.12, opacity 0.22→0.55, 1,800ms sine loop
Phase text:     fade out 220ms → setState → fade in 220ms
Phase durations: 1000 / 1000 / 1000 / 800ms
Exit:           fade out 300ms → trigger onComplete
```

---

## 7. Screen Hierarchy

### Screen 0 — Tell Your Dream (Voice First)

**Emotional object:** The microphone — large, breathing, alive.
**Interaction:** Hold to record. Release to process.
**Decision:** Which method (voice / write / image).

```
Layout:
  Title:      "Anlat."  (hero, 44px, no label above)
  Subtitle:   "Bilinçaltın dinliyor — yargılanmayacaksın."  (italic ghost)
  Methods:    3 tabs below subtitle (voice dominant visually)
  Content:    Full remaining space given to active method

Voice method (primary):
  Mic size:         96px diameter
  Idle ring:        breathing, opacity 0.10→0.28, scale 1.00→1.18
  Recording rings:  3 staggered ripples (0ms / 600ms / 1,200ms)
                    scale 1→1.9 / 1→2.4 / 1→3.0, opacity arc 0→0.45→0.12→0
  Waveform:         72px tall, 30 bars, gap 2px
  Timer:            22px, weight 200, letter-spacing 5, visible when recording or duration > 0
  Ghost text:       "Bilinçaltın dinliyor. / Yargılanmayacaksın." when idle

Text method (secondary):
  fontSize 17, weight 300, minHeight 40% of screen
  No border. No card. Pure text on void.

Image method (secondary):
  Two equal pick buttons (camera / gallery)
  On selection: full-width image preview with AI overlay bar
```

### Screen 1 — AI Analysis

**Emotional object:** Central pulsing orb.
**Interaction:** Watch. The user does nothing.
**Decision:** None. Auto-advances.

```
Layout:
  Center orb:     150×150px, breathing (scale 0.90→1.12)
  Inner glow:     76px, border 1.5px
  Core dot:       32px, rgba(196,181,253,0.85)
  Phase text:     Fades between 4 phases (icon + italic text)
  Ritual particles: active throughout
  Background:     FloatingStars + AmbientBg always on
```

### Screen 2 — Confirm Emotions

**Emotional object:** The orbit — nodes rotating around a pulsing center.
**Interaction:** Tap nodes to select (max 4).
**Decision:** Which emotions to confirm.

```
Layout:
  Label:   "DUYGULAR  ·  MAX 4"  (8.5px uppercase)
  Title:   "Hangi duygular / hissettirdi?"
  Orbit:   300×300px, centered, 6 nodes at ORB_R = 108px
  Below:   Selected chip row (color-tinted, appears on first selection)

Rules:
  - CenterPulse scales with selection count (×0.10 per emotion)
  - OrbitalParticles appear at 2+ selections
  - Selected nodes orbit 4× faster than unselected
  - No checkboxes. No lists. Orbit only.
```

### Screen 3 — Confirm Symbols

**Emotional object:** The floating symbol field with resonance lines.
**Interaction:** Tap chips. Lines draw between connections.
**Decision:** Which symbols to keep (max 5).

```
Layout:
  Label:   "SEMBOLLER  ·  MAX 5"
  Title:   "Hangi semboller / öne çıktı?"
  Reveal:  SymbolRevealCard appears on first tap of each symbol
            (meaning + archetype + emotion, auto-hides 2.6s)
  Field:   256px tall, chips at deterministic positions
  Lines:   Animate in per pair, fade out when pair breaks

Rules:
  - No grid. No list. Floating field only.
  - Tapping reveals meaning before confirming.
  - Lines connect selected symbols visually.
```

### Screen 4 — Energy Level

**Emotional object:** The intensity bar + glow on selected row.
**Interaction:** Tap one row.
**Decision:** Dream intensity (4 levels).

```
Layout:
  Label:   "ENERJİ  ·  İSTEĞE BAĞLI"
  Title:   "Rüyanın enerjisi / ne kadar güçlüydü?"
  Rows:    4 options, stacked vertically
  Auto-advance: 300ms after selection → Screen 5

Rules:
  - Rows are NOT standard list items.
  - Each row has a background intensity bar (fills proportionally).
  - Selected row has breathing glow overlay.
  - Auto-advance means no Continue button on this screen.
```

### Screen 5 — Dream Preview

**Emotional object:** The generated title — large, personal.
**Interaction:** Review. Optionally change visibility.
**Decision:** Visibility (public / followers / private).

```
Layout:
  Label:    "RÜYA ÖN İZLEME"
  Title:    AI-generated dream name (27px, weight 900)
  AI card:  Summary quote (italic, borderless feel)
  Metrics:  2×2 grid (dominant emotion / symbol / archetype / energy)
  Symbols:  Horizontal chip row (colored, borderless)
  Insight:  Single AI sentence, italic, no label
  Vis row:  3 compact chips (Herkese / Takipçi / Gizli)
```

### Screen 6 — Collective Result

**Emotional object:** The central orb — large, breathing, triumphant.
**Interaction:** Choose next action (dream detail / explore).
**Decision:** Where to go next.

```
Layout:
  Top:      Breathing orb (160px, always visible)
  Sending:  "Rüya kolektif alana giriyor…" + 3 dots (while submitting)
  Done:     3 resonance sentences (stagger-fade in)
            "X kişi bu gece benzer imgeler gördü."
            "X bilinç aynı duyguyu taşıdı."
            "X yeni rüya rezonansı tespit edildi."
  Buttons:  Primary CTA + secondary text link
  Particles: RitualParticles always active

Rules:
  - No stat cards. No numbers in boxes. Sentences only.
  - Language is poetic, collective, second-person plural implied.
  - Numbers are never raw — always embedded in human sentences.
```

---

## 8. Navigation

```
NavBar:
  Left:   Back chevron (step > 0) or empty View
  Center: Step dots (6 dots, active = wide pill, past = dim)
  Right:  Close × (always, except step 6)
  Step 6: NavBar hidden entirely

Dot widths:
  Past:   4px (dim violet)
  Active: 18px (primary violet)
  Future: 4px (white 12%)

ContinueBtn:
  Always shown except: step 1 (auto-advances), step 4 (auto-advances), step 6 (replaced by action buttons)
  Skip link: shown on step 2 and step 3 only
  Disabled state: opacity 0.35 (animated 280ms)
  Label on step 5: "Rüyayı Yayınla  ✦"
```

---

## 9. Component Checklist

Before building or modifying any screen component, verify:

- [ ] Does the screen have exactly ONE emotional object?
- [ ] Does the screen have exactly ONE primary interaction?
- [ ] Does the screen have exactly ONE decision point?
- [ ] Does the ambient background (FloatingStars + AmbientBg) show through?
- [ ] Does the ambient color reflect the dominant selected emotion?
- [ ] Are there zero standard cards / flat lists / form inputs (unless text method on screen 0)?
- [ ] Do all animations use sine easing for breathing, cubic-out for reveals?
- [ ] Does selection have both spring scale + haptic feedback?
- [ ] Is collective presence shown (people count, resonance, shared emotions)?
- [ ] Do all Animated.Values that drive layout (width/height) use `useNativeDriver: false`?
- [ ] Do all Animated.Values that drive opacity/transform use `useNativeDriver: true`?
- [ ] Are all module-level particle/star arrays stable (not recreated on render)?

---

## 10. What This System Explicitly Forbids

| Forbidden                        | Use Instead                          |
| -------------------------------- | ------------------------------------ |
| Standard card with border-radius | Breathing circle / orbital node      |
| Flat list of options             | Orbital system / floating field      |
| Static placeholder text          | Ghost text with subtle opacity anim  |
| Instant selection feedback       | Spring scale + haptic                |
| Raw numbers in UI                | Numbers embedded in human sentences  |
| Empty space between steps        | Particles / stars fill the void      |
| Labels above hero titles         | Hero title IS the label              |
| Multiple CTAs on one screen      | One primary action, one ghost link   |
| Checkboxes / radio buttons       | Orbital nodes / floating chips       |
| Progress bars (linear)           | Step dots (organic widths)           |
| Form validation errors           | Disabled ContinueBtn (no text error) |
