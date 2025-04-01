# Time Tracking App

## Overview
The Time Tracking App is designed to help individuals and teams effectively track time spent on tasks and projects. It provides features such as time logging, reporting, team collaboration, and integrations with third-party tools.

## Features
### 1. User Management
- Sign up / Login (Email & Password, OAuth for Google, GitHub, etc.)
- User Profiles (Name, Avatar, Role)
- Password Reset

### 2. Time Tracking
- Start & Stop Timer for Tasks
- Manual Time Entry (For adding missed time)
- Edit/Delete Tracked Time
- Categorize Entries (Work, Study, Break, etc.)
- Add Notes to Time Entries

### 3. Project & Task Management
- Create & Manage Projects
- Assign Tasks to Projects
- Task Status (To-Do, In Progress, Completed)
- Set Deadlines

### 4. Reporting & Analytics
- View Daily/Weekly/Monthly Time Reports
- Filter by Project, Task, or Date Range
- Export Reports (CSV, PDF)
- Time Utilization Charts

### 5. Team Collaboration (Optional)
- Create Teams
- Assign Team Members to Projects
- View Team Time Logs
- Role-Based Access (Admin, Member, Viewer)

### 6. Notifications & Reminders
- Reminder to Start/Stop Tracking
- Notifications for Overdue Tasks
- Daily Summary Email

### 7. Integrations (Optional)
- Calendar Sync (Google Calendar, Outlook)
- Task Management Tools (Trello, Asana, Notion)

## Database Schema & Relationships
### 1. Users Table
- `id` (PK)
- `name`
- `email` (Unique)
- `password_hash`
- `role` (Admin, Member)
- `created_at`
- `updated_at`

### 2. Projects Table
- `id` (PK)
- `user_id` (FK → Users)
- `name`
- `description`
- `status` (Active, Archived)
- `created_at`
- `updated_at`

### 3. Tasks Table
- `id` (PK)
- `project_id` (FK → Projects)
- `name`
- `description`
- `status` (To-Do, In Progress, Completed)
- `deadline`
- `created_at`
- `updated_at`

### 4. TimeEntries Table
- `id` (PK)
- `user_id` (FK → Users)
- `task_id` (FK → Tasks, Nullable)
- `start_time` (Timestamp)
- `end_time` (Timestamp, Nullable)
- `duration` (Computed: end_time - start_time)
- `category` (Work, Study, Break)
- `notes`
- `created_at`
- `updated_at`

### 5. Reports Table
- `id` (PK)
- `user_id` (FK → Users)
- `date`
- `total_time_spent`
- `generated_at`

### 6. Teams Table (If Collaboration Feature is Included)
- `id` (PK)
- `name`
- `created_at`
- `updated_at`

### 7. TeamMembers Table
- `id` (PK)
- `team_id` (FK → Teams)
- `user_id` (FK → Users)
- `role` (Admin, Member)

## Tech Stack
- **Backend:** Flask (Python) or Node.js (Express)
- **Database:** PostgreSQL or MongoDB
- **Frontend:** React, Vue, or Svelte
- **DateTime Handling:**
  - Python: `datetime`, `pytz`
  - JavaScript: `moment.js`, `date-fns`
- **Authentication:** JWT or OAuth
- **Deployment:** Render, Vercel, or AWS

## Setup Instructions
### Prerequisites
- Install Python 3.x (if using Flask) or Node.js (if using Express)
- Install PostgreSQL or MongoDB
- Install npm/yarn (for frontend development)

### Backend Setup
1. Clone the repository
   ```sh
   git clone https://github.com/benjaminmweribaya/time-tracking-app.git
   cd time-tracking-app/backend
   ```
2. Install dependencies
   ```sh
   pip install -r requirements.txt  # For Flask
   # OR
   npm install  # For Node.js
   ```
3. Set up the environment variables
4. Run the backend server
   ```sh
   flask run  # For Flask
   # OR
   node server.js  # For Node.js
   ```

### Frontend Setup
1. Navigate to the frontend folder
   ```sh
   cd ../frontend
   ```
2. Install dependencies
   ```sh
   npm install
   ```
3. Run the development server
   ```sh
   npm run dev
   ```

## Deployment
- Deploy the backend on **Render, Heroku, or AWS**
- Deploy the frontend on **Vercel, Netlify, or AWS**
- Use **Docker** for containerization if needed

## Contributing
1. Fork the repository
2. Create a new branch
3. Commit changes
4. Open a Pull Request

## License
This project is licensed under the MIT License.

