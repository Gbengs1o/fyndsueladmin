# FyndFuel Manager Dashboard - AI Handover & Implementation Guide

## 📌 Project Overview
The **FyndFuel Manager Dashboard** is a standalone, mobile-optimized web application designed for station managers in Nigeria. It allows them to update prices, manage their station's availability, and view market insights.

This app works alongside the **FyndFuel Admin Panel** and uses the same Supabase backend.

## 🛠 Tech Stack
- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Database/Auth**: Supabase
- **Icons**: Lucide React
- **UI Components**: Shadcn UI (recommended)

## 🗄 Database Context
We have already created the `manager_profiles` table in Supabase:
```sql
CREATE TABLE manager_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    station_id BIGINT REFERENCES stations(id),
    verification_status enum('pending', 'verified', 'rejected'),
    verification_photo_url TEXT, -- Photo of the station price board
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 Key Features to Build

### 1. Authentication & Onboarding
- **Sign Up**: Managers must provide Name, Phone Number, and select their Station from a list (fetched from `stations` table).
- **Verification Loop**: After sign-up, managers are in `pending` status. They MUST upload a photo of their station's physical price board (`verification_photo_url`) to be reviewed by Admins.
- **Lockout**: Until `verification_status` is `verified`, the dashboard should be locked.

### 2. "Big & Bold" Price Updater (Primary View)
- Large input fields for **PMS, AGO (Diesel), and Gas**.
- A "Save Changes" button that performs an **UPSERT** to the `official_prices` table.
- **Backend Note**: We have a trigger on `official_prices` that automatically syncs these values to the `stations` table for the mobile app to see.

### 3. Market Intelligence (Insights Tab)
- **Nearby Competitors**: Query the `stations` table for the 5 nearest stations (using PostGIS/lat-lng).
- **Price Comparison**: Show their prices vs. neighbors.
- **Search Impressions**: Show "Views" on their station (if analytics table exists).

### 4. Ground Truth Integration
- Fetch and display what users are currently reporting at their station:
    - Queue length (Short, Medium, Long).
    - Meter Accuracy (Reported by users).
    - Availability (If users report "No Fuel", show a warning).

### 5. Promotional Tools
- **Flash Sale Toggle**: A button to highlight the station on the main map.
- **Out of Stock Toggle**: Instantly mark the station as "Out of Fuel" to protect reputation.

## 🎨 Design Direction
- **Mobile First**: Managers will be using this on the forecourt.
- **Premium Aesthetic**: Use a dark/modern theme with vibrant status colors (Emerald for verified, Amber for pending).
- **Haptic/Visual Feedback**: Ensure buttons feel responsive and provide instant feedback.

## 🔗 Shared Components
You should point to the same Supabase project:
- URL: `https://ecvrdcijhdhobjtbtrcl.supabase.co`
- Use the `auth` system for manager accounts.
