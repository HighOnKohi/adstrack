# Adstrack System Overview

## What the System Is
The **Adstrack** system is a web-based administrative application tailored for **Siena College of Taytay**. It serves as a centralized hub for managing outreach or administrative schedules, external school registrations, inventory tracking, and user access. The system utilizes real-time database syncing (via Firebase Firestore) to ensure that all authorized personnel have the most current information across all modules.

## Key Features
- **Real-Time Data Sync:** All major modules (Schedules, Inventory, Schools, Users) feature live data updates. The UI includes connection status indicators and updates instantly when changes occur.
- **Authentication & Authorization:** Secure login system with role-based access control, restricting sensitive modules (like User Management) to administrators.
- **Interactive Calendar:** A visual calendar interface to track and manage scheduled meetings and appointments by day and month.
- **Granular Filtering & Search:** Advanced filtering tools across schedules and inventory to quickly find records based on dates, stock levels, or status.
- **Data Export/Printing:** Built-in functionality to print and export schedule summaries.

---

## Pages & Functionalities

### 1. Login (`/`)
- **Functionality:** Secure entry point for the application. Users must authenticate with an email and password before accessing the dashboard.

### 2. Homepage (`/home`)
- **Functionality:** A landing dashboard that displays Siena College of Taytay's mission, vision, and core objectives at a glance.

### 3. Schedules (`/schedules`)
- **Functionality:** The core scheduling directory for meetings and appointments.
- **Features:** 
  - View all scheduled meetings in a detailed table format.
  - Filter schedules by School Name, Date of Contract, Schedule Date & Time, and Status (Pending, Confirmed, Done).
  - Schedule new meetings with specific details: target school, academic level (SHS, JHS, Grade School), estimated attendees, companions, contract date, schedule date, and estimated time of departure.
  - Print schedule reports.

### 4. Calendar (`/calendar`)
- **Functionality:** A calendar-based visual layout of the schedules.
- **Features:** 
  - View meetings organized by month and day.
  - Interactive day cells that trigger a pop-up panel showing quick details (time, target school, and schedule status) when hovered or clicked.

### 5. Inventory (`/inventory`)
- **Functionality:** A comprehensive tracker for items, materials, and resources.
- **Features:** 
  - Add, edit, and delete inventory items (requires item ID, name, category, and quantity).
  - Search items by name or ID.
  - Filter items by category and stock status.
  - Automatic UI status computation indicating whether an item is "In Stock," "Low Stock," or "Out of Stock" based on its quantity.

### 6. Schools (`/schools`)
- **Functionality:** A directory of external schools registered in the system.
- **Features:** 
  - Register new schools with comprehensive details: Category (Public/Private), Contact Person, Contact Number, Email, Province, and Municipality.
  - Edit or delete existing school profiles.
  - Manage and record enrollment statistics for each registered school.

### 7. Manage Users (`/manage-users`)
- **Functionality:** Administrator-only control panel for managing application access.
- **Features:** 
  - Create new user accounts, allowing personnel to log in.
  - Edit existing user details, including updating passwords.
  - Remove user accounts to instantly revoke system access.

---

## Technology Stack
- **Frontend UI:** React (with React Router DOM for structured page navigation)
- **Backend & Database:** Firebase (Firebase Authentication for security and Cloud Firestore for robust, real-time database capabilities)
