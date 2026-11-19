# StudyTrack – Full-Stack Study Checklist & Syllabus Management Platform

**StudyTrack** is a production-ready, responsive, multi-user study checklist and revision management application. It allows students, educators, and lifelong learners to create and manage multiple subjects, organize them hierarchically into units and topics, track study completion percentage, attach external study links, upload documents to Supabase Storage, preview files in an in-app viewer, compose rich-text revision notes (with Tiptap), reorder with drag-and-drop (`dnd-kit`), and reset progress across topics, units, or whole subjects without losing notes or documents.

---

## 🚀 Key Features

1. **Multi-User Authentication & Security**:
   - Secure registration, login, logout, password change, and permanent account deletion.
   - JWT-based authentication with strict ownership validation (tokens verified server-side; user ID extracted from verified token).
   - Password hashing with `bcryptjs`.
   - Security middleware: `helmet`, `cors`, and `express-rate-limit`.

2. **Dashboard & Analytics**:
   - Welcome banner with live metric cards: Total Subjects, Total Units & Topics, Completed Topics, Remaining Topics, and Overall Completion Percentage.
   - Dynamic subject-wise progress bars.
   - Recently studied topics and recently updated revision notes widgets.
   - Search, filter, and sort subject cards.

3. **Subject Management**:
   - Unlimited subjects with customizable names, descriptions, color themes, and icons.
   - Full CRUD: Create, Read, Update, Delete with confirmation modals.
   - Subject duplication (replicates units, topics, URL materials, and notes with reset progress).
   - Cascading deletion for all associated child units, topics, notes, and uploaded documents.

4. **Unit & Chapter Hierarchy**:
   - Unlimited units per subject with collapse/expand toggles.
   - Unit-level progress counters and dynamic progress indicators.
   - Drag-and-drop reordering of units.

5. **Topic Checklist & Progress Tracking**:
   - Topic completion checkbox that immediately persists to MongoDB and updates subject and unit progress.
   - Metadata support: priority tags (`low`, `medium`, `high`), target deadlines, and descriptions.
   - Drag-and-drop reordering within units.
   - Move topics seamlessly between units.
   - Topic status filter: All, Pending, Completed.

6. **Study Materials & Document Management**:
   - **External URL Materials**: Attach documentation, YouTube videos, lecture links with custom titles and an **OPEN STUDY MATERIAL** direct launch button.
   - **Document Upload**: Multi-file document upload (PDF, DOC, DOCX, PPT, PPTX, TXT, Images) up to 25MB.
   - **Storage Strategy**: Actual uploaded documents are stored in a private Supabase Storage bucket with short-lived signed URLs (with a local fallback for offline/development environments).
   - **In-App Document Viewer**: Fullscreen modal viewer supporting PDFs, images, text, and direct download buttons for presentation/word formats.
   - Safe material replacement, title editing, and deletion (removes both Supabase object and MongoDB metadata).

7. **Rich-Text Topic Revision Notes**:
   - Embedded Tiptap rich-text editor for every topic (Headings, Bold, Italic, Bullet lists, Ordered lists, Code blocks).
   - Automatic debounced saving with timestamp indicators.
   - Notes overview page with search across all notes in all subjects.

8. **Reset Progress Functionality**:
   - Independent reset operations:
     1. Reset individual topic.
     2. Reset an entire unit.
     3. Reset an entire subject.
     4. Reset all checklist progress.
   - Preserves all topics, units, notes, and uploaded documents while resetting completed flags.

9. **Global Search**:
   - Debounced search across subjects, units, topics, notes content, and study material titles with status and subject filters.

10. **Modern UI/UX**:
    - Dark mode and Light mode toggling with system preference detection.
    - Responsive desktop sidebar and mobile navigation drawer.
    - Non-intrusive floating toast notifications and accessible confirmation dialogs.

---

## 🛠️ Technology Stack

- **Frontend**:
  - React 19 + TypeScript + Vite
  - Tailwind CSS v4
  - React Router DOM v7
  - @dnd-kit (Core, Sortable, Utilities)
  - Tiptap Rich Text Editor (@tiptap/react, @tiptap/starter-kit, @tiptap/extension-link)
  - Lucide React icons
  - Axios for REST client

- **Backend**:
  - Node.js + Express.js + TypeScript
  - MongoDB + Mongoose ODM
  - JSON Web Tokens (`jsonwebtoken`) + `bcryptjs`
  - Zod for request validation
  - Multer for streaming file uploads
  - Supabase Storage SDK (`@supabase/supabase-js`)
  - Helmet & Express Rate Limit

---

## 📂 Project Structure

```
StudyTrack/
├── backend/
│   ├── src/
│   │   ├── config/          # Environment & DB & Supabase config
│   │   ├── controllers/     # Express route handlers
│   │   ├── middleware/      # Auth, Multer, Error handlers
│   │   ├── models/          # Mongoose data models (User, Subject, Unit, Topic, Material, Note)
│   │   ├── routes/          # REST API route endpoints
│   │   ├── services/        # Storage service (Supabase & fallback)
│   │   ├── types/           # Backend TypeScript definitions
│   │   ├── validators/      # Zod validation schemas
│   │   └── index.ts         # App entry point
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Common modals, Subject, Unit, Topic, Material components
│   │   ├── contexts/        # Auth, Theme, and Toast context providers
│   │   ├── pages/           # Dashboard, Subjects, SubjectDetail, Notes, Search, Settings, Auth
│   │   ├── services/        # Axios API client
│   │   ├── types/           # Frontend TypeScript interfaces
│   │   ├── App.tsx          # Router configuration
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
└── README.md
```

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/studytrack
JWT_SECRET=your_super_secret_jwt_key_here
JWT_ACCESS_EXPIRES_IN=7d
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_BUCKET=studytrack-documents
FRONTEND_URL=http://localhost:5173
MAX_FILE_SIZE=25MB
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=/api
```

---

## 🏃 Running the Application

### 1. Start MongoDB
Ensure MongoDB is running locally or provide a MongoDB Atlas URI in `backend/.env`:
```bash
sudo systemctl start mongod
```

### 2. Run the Backend
```bash
cd backend
npm install
npm run dev
```
Backend will start on `http://localhost:5000`.

### 3. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend will be live on `http://localhost:5173`.

### 4. Running the Full Integration Test Suite
```bash
cd backend
node test_suite.js
```
