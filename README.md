# RevYouw

Study smarter, panic less. Upload your notes and get flashcards or a quiz back, built from whatever you actually uploaded, not generic questions.

Most study apps generate pretty generic questions. This reads the actual file, a 40-slide deck, a scanned PDF, even a photo of handwritten notes, and builds everything from what's actually in it.

## What it does

- Upload a PDF, PPTX, DOCX, XLSX, or an image of your notes
- Extracts the text (OCR for images) and sends it to an LLM
- Generates flashcards, a multiple choice quiz, or both
- Pick a difficulty: easy for a first pass, hard for the night before the exam
- No account needed to try it, sign in with Google or email if you want to save your reviewers

## How it works

1. File comes in through the uploader
2. A different parser handles extraction depending on file type (PDF, DOCX, PPTX, XLSX, or image OCR)
3. Extracted text, plus the mode and difficulty you picked, gets sent to Groq
4. LLaMA 3.3 70B returns structured flashcards or quiz questions
5. If you're signed in, the session saves to Firestore so you can come back to it later

## Stack

**Frontend:** Next.js 15 (App Router, TypeScript), Tailwind CSS v4, react-dropzone

**AI:** Groq / LLaMA 3.3 70B for question generation, Groq Vision (Llama 4 Scout) for OCR on images

**File parsing:** unpdf (PDF), mammoth (DOCX/DOC), officeparser (PPTX/ODT/ODP), SheetJS (Excel), sharp (HEIC/HEIF conversion)

**Backend:** Firebase Auth, Firestore, Cloudinary for file storage

**Hosting:** Vercel, Next.js API routes for the server-side processing and AI calls

## Running it locally

```bash
git clone <repo-url>
cd revyouw
npm install
```

Add a `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

GROQ_API_KEY=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

```bash
npm run dev
```

## Project structure

```
src/
  app/
    (auth)/            login, signup
    (dashboard)/       dashboard, upload, reviewers
    page.tsx           landing page
    globals.css        theme variables + base styles
  components/ui/        Input, Spinner, ThemeSwitch, etc.
  context/              AuthContext, ThemeContext
  lib/firebase.ts
```

## Themes

Five of them: Paper, Hello Kitty, Readable, Dark, and Plain. Switching themes is just a `data-theme` attribute, every color lives as a CSS variable in `globals.css`. Hello Kitty is exactly what it sounds like.