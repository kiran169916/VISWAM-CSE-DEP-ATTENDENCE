# Viswam CSE Department Attendance Management System

## Overview
A full-stack web application designed for the Viswam CSE Department to manage daily student attendance, generate reports, and monitor department attendance.

## Tech Stack
- **Frontend**: React.js, TailwindCSS, Chart.js, Axios
- **Backend**: Node.js, Express.js, better-sqlite3 (SQLite for zero-config deployment, easily swappable to PostgreSQL/MySQL)
- **Authentication**: JWT, bcrypt

## Setup & Installation

### Prerequisites
- Node.js (v18+)
- npm

### Running the Project

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server (Frontend + Backend):
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   npm start
   ```

## Initial Login
- **Role**: HOD (Admin)
- **Email**: `hod@viswam.edu`
- **Password**: `admin123`

## Database Schema (SQL)
If you wish to migrate to PostgreSQL or MySQL, use the following schema:

```sql
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK(role IN ('HOD', 'Faculty', 'Student'))
);

CREATE TABLE students (
  student_id SERIAL PRIMARY KEY,
  student_name VARCHAR(255) NOT NULL,
  roll_number VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  department VARCHAR(100) NOT NULL,
  year INT NOT NULL,
  section VARCHAR(10) NOT NULL
);

CREATE TABLE faculty (
  faculty_id SERIAL PRIMARY KEY,
  faculty_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  subject_assigned VARCHAR(255)
);

CREATE TABLE subjects (
  subject_id SERIAL PRIMARY KEY,
  subject_name VARCHAR(255) NOT NULL,
  faculty_id INT,
  FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)
);

CREATE TABLE attendance (
  attendance_id SERIAL PRIMARY KEY,
  student_id INT NOT NULL,
  subject_id INT NOT NULL,
  faculty_id INT NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK(status IN ('Present', 'Absent')),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(student_id),
  FOREIGN KEY (subject_id) REFERENCES subjects(subject_id),
  FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id),
  UNIQUE(student_id, subject_id, date)
);
```

## Desktop Version (Electron.js) Instructions

To convert this web application into a standalone Windows `.exe` file using Electron, follow these steps:

1. **Install Electron and Electron Builder**:
   ```bash
   npm install --save-dev electron electron-builder concurrently wait-on
   ```

2. **Create `main.js` in the root directory**:
   ```javascript
   const { app, BrowserWindow } = require('electron');
   const path = require('path');
   
   // Start the Express server
   require('./dist/server.cjs');

   function createWindow () {
     const win = new BrowserWindow({
       width: 1200,
       height: 800,
       webPreferences: {
         nodeIntegration: true
       }
     });

     // Load the local server URL
     win.loadURL('http://localhost:3000');
   }

   app.whenReady().then(createWindow);

   app.on('window-all-closed', () => {
     if (process.platform !== 'darwin') {
       app.quit();
     }
   });
   ```

3. **Update `package.json`**:
   Add the following properties to your `package.json`:
   ```json
   "main": "main.js",
   "scripts": {
     "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:3000 && electron .\"",
     "electron:build": "npm run build && electron-builder"
   },
   "build": {
     "appId": "com.viswam.attendance",
     "productName": "Viswam Attendance System",
     "directories": {
       "output": "release/"
     },
     "win": {
       "target": ["nsis"]
     }
   }
   ```

4. **Build the `.exe` file**:
   ```bash
   npm run electron:build
   ```
   The installer will be generated in the `release/` folder.
