import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ReviewAI — Smart Study Assistant",
  description: "AI-powered reviewer for students. Upload files, generate flashcards and quizzes instantly.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#1e1e2e",
                color: "#cdd6f4",
                border: "1px solid #313244",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}