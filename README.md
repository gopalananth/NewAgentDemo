# New Agent Demo Platform

A full-stack web application for managing and demonstrating AI agents with Office 365 authentication, built with React, Node.js, and PostgreSQL.

## 🚀 Features

### Core Functionality
- **Office 365 Authentication**: Secure login using Azure Active Directory
- **Role-Based Access Control**: Administrator and Demo User roles
- **Domain Management**: Organize agents by domain/category
- **Agent Management**: Full CRUD operations with rich metadata
- **Q&A Management**: Rich text questions and answers with automatic variant generation
- **Chat Interface**: Interactive chat with AI agents
- **Session Management**: Track and manage user chat sessions
- **Audit Logging**: Complete activity tracking for administrators

### Technical Features
- **Responsive Design**: Mobile-friendly blue and white theme
- **Real-time Updates**: Live chat interface with message history
- **Rich Text Editor**: HTML formatting for answers
- **Text Variants**: Automatic paraphrasing of questions and answers
- **Secure API**: Rate limiting, CORS, and authentication middleware
- **Database Integration**: PostgreSQL with Sequelize ORM
- **Modern Frontend**: React with hooks, styled-components, and React Query

## 🏗️ Architecture

```
Frontend (React)          Backend (Node.js/Express)     Database (PostgreSQL)
├── Authentication        ├── Azure AD Integration      ├── Users & Roles
├── Admin Dashboard       ├── RESTful API               ├── Domains & Agents
├── Agent Management      ├── Session Management        ├── Q&A with Variants
├── Chat Interface        ├── Audit Logging             ├── Chat Sessions
└── Blue/White Theme      └── Security Middleware       └── Audit Logs
```

## 📋 Requirements

- **Node.js** 18+ LTS
- **PostgreSQL** 12+
- **Azure Account** (for Office 365 authentication)
- **Modern Web Browser**

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/NewAgentDemo.git
cd NewAgentDemo
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install all dependencies (frontend + backend)
npm run install:all
```

### 3. Set Up Database
1. Install PostgreSQL locally or use a cloud provider
2. Create a database named `new_agent_demo`
3. Note your connection details

### 4. Configure Environment Variables
Copy the backend environment file and fill in your values:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=new_agent_demo
DB_USER=your_username
DB_PASSWORD=your_password

# JWT Secret (generate a random 32-character string)
JWT_SECRET=your_super_secret_jwt_key_here

# Azure AD Configuration (from your Azure app registration)
AZURE_CLIENT_ID=your_azure_client_id
AZURE_CLIENT_SECRET=your_azure_client_secret
AZURE_TENANT_ID=your_azure_tenant_id
AZURE_REDIRECT_URI=http://localhost:3001/auth/azure/callback

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Session Secret (generate another random 32-character string)
SESSION_SECRET=your_session_secret_here
```

### 5. Set Up Azure AD App Registration
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Create a new registration:
   - Name: `NewAgentDemo-Local`
   - Redirect URI: `http://localhost:3001/api/auth/azure/callback`
4. Note the Application (client) ID and Directory (tenant) ID
5. Create a client secret and note the value
6. Update your `.env` file with these values

### 6. Start Development Servers
```bash
# Start both frontend and backend
npm run dev

# Or start them separately:
npm run server:dev  # Backend on http://localhost:3001
npm run client:dev  # Frontend on http://localhost:3000
```

### 7. Create Administrator User
1. Visit http://localhost:3000
2. Login with Office 365
3. You'll be logged in as a Demo User
4. Connect to your PostgreSQL database and run:
```sql
UPDATE "User" SET role = 'Administrator' WHERE email = 'your_email@domain.com';
```

## 🔧 Configuration

### Environment Variables

#### Backend (Required)
| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `new_agent_demo` |
| `DB_USER` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | `password123` |
| `JWT_SECRET` | JWT signing secret | `32-char-random-string` |
| `AZURE_CLIENT_ID` | Azure AD app client ID | `abc123...` |
| `AZURE_CLIENT_SECRET` | Azure AD app secret | `def456...` |
| `AZURE_TENANT_ID` | Azure AD tenant ID | `ghi789...` |
| `AZURE_REDIRECT_URI` | OAuth callback URL | `http://localhost:3001/api/auth/azure/callback` |
| `SESSION_SECRET` | Session signing secret | `32-char-random-string` |

#### Backend (Optional)
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

#### Frontend (Optional)
| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `/api` |

## 📚 API Documentation

### Authentication Endpoints

#### `POST /api/auth/login`
Initiates Office 365 login flow.

**Response**: Redirects to Azure AD login page

#### `GET /api/auth/status`
Returns current authentication status.

**Response**:
```json
{
  "success": true,
  "authenticated": true,
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Administrator"
  }
}
```

#### `POST /api/auth/logout`
Logs out the current user.

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Admin Endpoints (Administrator only)

#### Domain Management
- `GET /api/admin/domains` - List all domains
- `POST /api/admin/domains` - Create new domain
- `PUT /api/admin/domains/:id` - Update domain
- `DELETE /api/admin/domains/:id` - Delete domain

#### Agent Management
- `GET /api/admin/agents` - List all agents
- `POST /api/admin/agents` - Create new agent
- `PUT /api/admin/agents/:id` - Update agent
- `DELETE /api/admin/agents/:id` - Delete agent
- `PUT /api/admin/agents/:id/status` - Update agent status (Draft/Final)

#### Q&A Management
- `GET /api/admin/agents/:agentId/questions` - List agent's Q&A
- `POST /api/admin/agents/:agentId/questions` - Create Q&A with variants
- `PUT /api/admin/questions/:id` - Update Q&A and regenerate variants
- `DELETE /api/admin/questions/:id` - Delete Q&A
- `PUT /api/admin/questions/:id/status` - Update Q&A status

### Demo Endpoints (All authenticated users)

#### Agent Viewing
- `GET /api/demo/domains` - List domains with final agents
- `GET /api/demo/agents/:id` - Get agent details

#### Chat Interface
- `POST /api/demo/agents/:id/chat/start` - Start chat session
- `POST /api/demo/chat/:sessionId/message` - Send message
- `GET /api/demo/chat/:sessionId/history` - Get chat history
- `POST /api/demo/chat/:sessionId/end` - End chat session
- `GET /api/demo/chat/sessions` - List user's sessions

## 🎨 Theme & Design

The application uses a professional blue and white color scheme:

### Primary Colors
- **Primary Blue**: `#3b82f6` - Main buttons and links
- **Secondary Blue**: `#0ea5e9` - Accents and highlights  
- **Navy**: `#1e293b` - Headers and emphasis
- **White**: `#ffffff` - Backgrounds and cards

### Typography
- **Font Family**: Inter (Google Fonts)
- **Headings**: Semibold to Bold weights
- **Body Text**: Regular weight
- **Code**: JetBrains Mono

### Components
All components follow the design system with consistent:
- Spacing (based on 4px grid)
- Border radius (4px, 8px, 12px)
- Shadows (subtle elevation)
- Transitions (150ms ease)

## 🔒 Security Features

### Authentication & Authorization
- **Office 365 SSO**: Secure authentication via Azure AD
- **Role-Based Access**: Administrator and Demo User roles
- **Session Management**: Secure session storage in PostgreSQL
- **CSRF Protection**: Built-in session protection

### API Security
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configured for frontend domain only
- **Helmet**: Security headers and XSS protection
- **Input Validation**: All endpoints validate input data
- **SQL Injection Protection**: Sequelize ORM with parameterized queries

### Data Protection
- **Audit Logging**: All admin actions logged with IP and user agent
- **Password Hashing**: Not applicable (uses Azure AD)
- **Environment Variables**: Sensitive data in environment variables
- **HTTPS**: Required in production (handled by Azure)

## 🧪 Testing

### Manual Testing Checklist

#### Authentication
- [ ] Office 365 login works
- [ ] Logout works and clears session
- [ ] Unauthorized access is blocked
- [ ] Role-based access control works

#### Administrator Features
- [ ] Can create, edit, delete domains
- [ ] Can create, edit, delete agents
- [ ] Can manage Q&A with rich text
- [ ] Variants are generated automatically
- [ ] Status management (Draft/Final) works
- [ ] Audit logs are created

#### Demo User Features
- [ ] Can view agents by domain
- [ ] Can start chat sessions
- [ ] Can send and receive messages
- [ ] Chat history is preserved
- [ ] Agent access count increments

#### UI/UX
- [ ] Responsive design works on mobile
- [ ] Theme colors are consistent
- [ ] Loading states work
- [ ] Error messages are helpful
- [ ] Toast notifications appear

## 📱 User Roles & Permissions

### Administrator
- **Full Access**: Can manage all aspects of the platform
- **Domain Management**: Create, edit, delete domains
- **Agent Management**: Full CRUD operations on agents
- **Q&A Management**: Manage questions, answers, and variants
- **User Management**: View audit logs and user activity
- **Status Control**: Publish/unpublish content (Draft/Final)

### Demo User
- **Read Access**: View published agents and domains
- **Chat Interface**: Interact with agents via chat
- **Session History**: View their own chat history
- **Limited Scope**: Only see final/published content

## 🚀 Deployment

### Azure Deployment
For detailed Azure deployment instructions, see [AZURE_DEPLOYMENT_GUIDE.md](./AZURE_DEPLOYMENT_GUIDE.md).

**Quick Overview:**
1. Create Azure AD app registration
2. Deploy PostgreSQL database
3. Deploy backend to App Service
4. Deploy frontend to Static Web App
5. Configure environment variables
6. Create first administrator user

### Local Production Build
```bash
# Build frontend
cd frontend
npm run build

# Start backend in production mode
cd ../backend
NODE_ENV=production npm start
```

### Docker (Optional)
```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 🛠️ Development

### Project Structure
```
NewAgentDemo/
├── backend/                 # Node.js/Express API
│   ├── config/             # Database and auth config
│   ├── middleware/         # Authentication and authorization
│   ├── models/             # Sequelize database models
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic and utilities
│   └── server.js           # Main server file
├── frontend/               # React application
│   ├── public/             # Static files
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts (auth, theme)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service functions
│   │   ├── styles/         # Theme and global styles
│   │   └── utils/          # Utility functions
│   └── package.json
├── docs/                   # Additional documentation
├── package.json           # Root package.json
└── README.md
```

### Database Schema
The application uses the following main entities:

- **User**: Authentication and role management
- **Domain**: Agent organization/categorization
- **Agent**: AI agent metadata and configuration
- **Question**: Questions for agents
- **Answer**: Rich text answers
- **QuestionVariant**: Generated question paraphrases
- **AnswerVariant**: Generated answer paraphrases
- **ChatSession**: User chat sessions
- **ChatMessage**: Individual chat messages
- **AuditLog**: Activity tracking

### Adding New Features

1. **Backend**: Add routes in `backend/routes/`
2. **Database**: Update models in `backend/models/`
3. **Frontend**: Create components in `frontend/src/components/`
4. **Pages**: Add pages in `frontend/src/pages/`
5. **Styling**: Follow the theme in `frontend/src/styles/theme.js`

### Code Style
- **JavaScript**: ES6+ with async/await
- **React**: Functional components with hooks
- **Styling**: Styled-components with theme variables
- **API**: RESTful conventions
- **Documentation**: JSDoc comments for functions

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
Error: connect ECONNREFUSED 127.0.0.1:5432
```
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists

#### Azure AD Authentication Fails
```
Authentication failed or user not found
```
- Check Azure AD app registration settings
- Verify redirect URI matches exactly
- Ensure client secret hasn't expired

#### Frontend Build Fails
```bash
npm ERR! Build failed
```
- Clear node_modules and package-lock.json
- Run `npm install` again
- Check for dependency conflicts

#### CORS Errors
```
Access blocked by CORS policy
```
- Check `FRONTEND_URL` in backend `.env`
- Ensure frontend is running on expected port
- Verify CORS configuration

### Getting Help
1. Check the console for error messages
2. Review server logs for API issues
3. Check network tab for failed requests
4. Verify environment variables are set correctly
5. Consult Azure Portal for deployment issues

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions:
- Create an issue in this repository
- Review the troubleshooting section above
- Check the Azure deployment guide for deployment issues

## 🙏 Acknowledgments

- **Microsoft Azure** for cloud services and authentication
- **React Team** for the excellent frontend framework
- **Express.js** for the robust backend framework
- **PostgreSQL** for reliable data storage
- **Open Source Community** for the amazing libraries used

---

**Built with ❤️ using React, Node.js, and PostgreSQL**