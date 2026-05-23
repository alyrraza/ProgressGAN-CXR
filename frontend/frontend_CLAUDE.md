# CLAUDE.md — Frontend Instructions

## Your Job

Build an impressive, professional React frontend for ProgressGAN-CXR.
This is a medical AI product for chest X-ray education and research showcase.
It must look like a real product, not a demo.

## Tech Stack

- React 18 with TypeScript
- Tailwind CSS for styling
- Axios for API calls
- Recharts for metric visualizations
- Framer Motion for animations
- React Router for navigation

## Design Language

**Theme:** Dark medical/clinical aesthetic
**Primary color:** #00D4FF (cyan blue, medical feel)
**Background:** #0A0E1A (very dark navy)
**Surface:** #111827 (dark card background)
**Border:** #1F2937
**Text primary:** #F9FAFB
**Text secondary:** #9CA3AF
**Success:** #10B981
**Warning:** #F59E0B
**Error:** #EF4444

Font: Inter for UI, monospace for numbers/scores

The design should feel like a professional medical imaging tool crossed with a research dashboard.
Think: dark mode, subtle gradients, clean cards, smooth transitions.
NOT cartoonish, NOT overly colorful, NOT generic AI startup look.

## Pages and Navigation

```
/ (Home)
/simulator    (Disease Progression Simulator)
/challenge    (Diagnostic Challenge)
/compare      (Model Comparison)
/research     (Research Findings)
```

## Page 1: Home (/)

Hero section with:
- Title: "ProgressGAN-CXR"
- Subtitle: "Severity-Conditioned Chest X-Ray Synthesis for Medical Education and Research"
- Three stat cards: "4 GAN Models" | "21,165 Training Images" | "95.28% Classifier Accuracy"
- Four feature cards linking to each section
- Brief "What this does" paragraph

## Page 2: Disease Progression Simulator (/simulator)

This is the main product feature. Must be visually impressive.

Layout:
- Left panel: Controls
  - Model selector dropdown (KD Generator / DCGAN / Spectral DCGAN / WGAN-GP)
  - Severity slider: 0.0 to 1.0, step 0.01
  - Severity label that updates: Normal / Mild / Moderate / Severe / COVID
  - "Random Noise" button to generate new base image
  - "Generate" button

- Center: X-ray display
  - Large dark card showing the generated X-ray
  - Grayscale image, medical look
  - Subtle scan-line overlay effect for clinical aesthetic
  - Loading skeleton while generating
  - Smooth fade transition between images

- Right panel: Info
  - Current severity score displayed prominently
  - Current model name and its metrics (FID / Spearman r / SSIM)
  - Brief description of what severity score means clinically

Severity label mapping:
- 0.0 - 0.15: Normal (green badge)
- 0.16 - 0.45: Lung Opacity (yellow badge)
- 0.46 - 0.75: Viral Pneumonia (orange badge)
- 0.76 - 1.0: COVID-19 (red badge)

On slider move: debounce 300ms then auto-call /generate API.

## Page 3: Diagnostic Challenge (/challenge)

Medical education game. Must feel engaging.

Flow:
1. "Start Challenge" button
2. System generates X-ray at random severity, shows it large
3. User sees 4 buttons: Normal / Lung Opacity / Viral Pneumonia / COVID
4. User clicks their diagnosis
5. Result reveals:
   - User answer (correct/incorrect with icon)
   - AI classifier answer (correct/incorrect)
   - Actual severity score and class
   - Brief explanation of visual clues
6. "Next Challenge" button

Score tracking:
- Session score displayed: "You: 7/10 | AI: 9/10"
- Progress bar

Design: Clean game-like feel but still clinical. No childish animations.

## Page 4: Model Comparison (/compare)

Four-way model comparison. Research showcase.

Layout:
- Top: Severity slider + "Generate All" button + seed input (optional)
- Middle: 2x2 grid of X-ray images
  - Each card labeled: KD Generator / DCGAN / Spectral DCGAN / WGAN-GP
  - Below each image: FID | Spearman r | SSIM scores as small badges
  - "Best" badge on the metric winner for each metric
- Bottom: Summary sentence explaining which model wins what

Loading: All 4 images load simultaneously, each shows skeleton until ready.

## Page 5: Research Findings (/research)

Static research dashboard. Professional, paper-like.

Sections:
1. "The Problem with FID" — short paragraph + the four-model comparison bar chart (use Recharts, not the PNG)
2. "Severity Disentanglement" — Spearman r comparison bar chart
3. "Temporal Consistency" — SSIM comparison bar chart
4. "Downstream Classification" — table showing the three augmentation conditions
5. "Key Contributions" — four numbered findings in clean card layout
6. "Severity Progression" — embed the severity_progression.png image

Use Recharts for all charts. Colors matching the design system.

## API Integration

Create a single api.ts service file:

```typescript
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000"

export const generateXray = async (severity: number, model: string, seed?: number) => {
  const response = await axios.post(`${API_BASE}/generate`, { severity, model, seed })
  return response.data
}

export const classifyXray = async (imageBase64: string) => {
  const response = await axios.post(`${API_BASE}/classify`, { image_base64: imageBase64 })
  return response.data
}

export const compareModels = async (severity: number, seed?: number) => {
  const response = await axios.post(`${API_BASE}/compare`, { severity, seed })
  return response.data
}

export const startChallenge = async () => {
  const response = await axios.post(`${API_BASE}/challenge`)
  return response.data
}

export const submitAnswer = async (challengeId: string, userAnswer: string) => {
  const response = await axios.post(`${API_BASE}/challenge/${challengeId}/answer`, {
    user_answer: userAnswer
  })
  return response.data
}
```

## Environment Variables

```
REACT_APP_API_URL=http://localhost:8000
```

For Vercel deployment: set in Vercel dashboard.

## Navbar

Simple dark navbar:
- Left: "ProgressGAN-CXR" logo/text
- Right: navigation links (Home, Simulator, Challenge, Compare, Research)
- Mobile: hamburger menu

## Error Handling

Every API call must show:
- Loading state (skeleton or spinner)
- Error state (clean error card with retry button)
- Never crash silently

## Image Display

All X-rays are base64-encoded grayscale PNGs from the API.
Display using: `<img src={`data:image/png;base64,${imageBase64}`} />`
Apply CSS filter: `filter: brightness(1.1) contrast(1.1)` for clinical look.
Border: 1px solid #1F2937
Border radius: 8px

## Vercel Deployment Config

Create vercel.json:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

## Performance Requirements

- Initial load < 3 seconds
- Generation response displayed within 2 seconds of API response
- No layout shift during image load (reserve fixed dimensions)
- Lazy load the Research page charts
