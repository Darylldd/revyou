import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "600", "700", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "ReviewAI — Study Like Your Exam Is Tomorrow",
  description:
    "AI-powered reviewer for students. Upload files, generate flashcards and quizzes instantly.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#1a1510",
                color: "#f0e6d3",
                border: "1px solid #2d2318",
                fontFamily: "var(--font-inter)",
                fontSize: "13px",
              },
              success: {
                iconTheme: { primary: "#d4890a", secondary: "#1a1510" },
              },
              error: {
                iconTheme: { primary: "#dc2626", secondary: "#1a1510" },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}