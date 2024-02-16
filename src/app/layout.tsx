"use client"

import { Roboto_Mono } from "next/font/google"
import React from "react"
import "./globals.css"

const inter = Roboto_Mono({ subsets: ["latin"] })

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
