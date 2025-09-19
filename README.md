# Digital Chikitsak - Telemedicine Platform

A comprehensive telemedicine platform designed specifically for rural healthcare in Punjab, India. This application provides multi-language support (Hindi, English, Punjabi) and focuses on accessibility for users with varying literacy levels.

## 🌟 Features

### Core Functionality
- **Language Selection**: Mandatory startup language selection (Hindi, English, Punjabi)
- **Visual Symptom Checker**: Picture-based symptom selection for low-literacy users
- **AI Health Recommendations**: Intelligent health advice based on symptoms using machine learning
- **Voice Chat**: Multi-language voice interaction with speech recognition
- **Video Consultation**: Integrated video calls with healthcare providers using Jitsi Meet
- **Pharmacy Finder**: Real-time location-based pharmacy search with stock information
- **Family Management**: Comprehensive family health record management
- **Disease Prediction**: ML-based disease prediction system with confidence scoring

### Accessibility Features
- **Multi-language UI**: Complete interface translation
- **Visual Communication**: Icon-based navigation and symptom selection
- **Voice Interface**: Speech recognition and synthesis
- **Simple Navigation**: Intuitive design for all literacy levels

## 🛠️ Technology Stack

### Frontend
- **React 18.2.0** with **Vite** build system
- **Tailwind CSS** for styling with custom teal theme
- **Framer Motion** for smooth animations
- **React Router Dom** for navigation
- **React Hot Toast** for notifications
- **i18next** for internationalization
- **Lucide React** for icons

### Backend
- **Flask** (Python) REST API
- **MySQL** database (primary) with **SQLite** fallback
- **JWT Authentication**
- **RESTful API architecture**
- **Scikit-learn** for machine learning disease prediction
- **Jitsi Meet** for video conferencing

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- Python 3.8+
- MySQL database (optional, SQLite fallback available)
- npm or yarn

### One-Click Startup (Windows)
Simply double-click on `start-all.bat` to start all services:
- Main Backend API (Port 5000)
- Disease Prediction API (Port 5001)
- Frontend Development Server (Port 5173+)

To stop all services, double-click on `stop-all.bat`.

### Manual Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Digital-Chikitsak
   ```

2. **Frontend Setup**
   ```bash
   cd frontend/rishu-diital-chikitsak
   npm install
   npm run dev
   ```

3. **Backend Setup**
   ```bash
   cd backend/chikitsak-backend
   pip install -r requirements.txt
   python app.py
   ```

4. **Disease Prediction API Setup**
   ```bash
   python api.py
   ```

### Development URLs
- Frontend: `http://localhost:5173`
- Main Backend API: `http://localhost:5000`
- Disease Prediction API: `http://localhost:5001`

## 📁 Project Structure

```
Digital-Chikitsak/
├── start-all.bat                  # One-click start script (Windows)
├── start-all-advanced.bat         # Advanced start script with checks (Windows)
├── stop-all.bat                   # Stop all services script (Windows)
├── frontend/rishu-diital-chikitsak/
│   ├── public/
│   │   ├── Logo.png
│   │   └── vite.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── LanguageSelector.jsx    # Initial language selection
│   │   │   ├── TemplatePage.jsx       # Reusable page template
│   │   │   ├── VoiceChat.jsx          # Voice interaction
│   │   │   ├── VideoConsultation.jsx  # Video calling
│   │   │   └── PharmacyFinder.jsx     # Pharmacy locator
│   │   ├── pages/
│   │   │   ├── Home.jsx               # Landing page
│   │   │   ├── Login.jsx              # Authentication
│   │   │   ├── Register.jsx           # User registration
│   │   │   ├── patient/               # Patient-specific pages
│   │   │   └── doctor/                # Doctor-specific pages
│   │   ├── i18n/
│   │   │   ├── index.js               # i18n configuration
│   │   │   └── locales/
│   │   │       ├── en.json            # English translations
│   │   │       ├── hi.json            # Hindi translations
│   │   │       └── pa.json            # Punjabi translations
│   │   ├── services/
│   │   │   ├── api.js                 # API client
│   │   │   └── auth.js                # Authentication
│   │   ├── utils/
│   │   ├── App.jsx                    # Main app component
│   │   ├── main.jsx                   # React entry point
│   │   └── router.jsx                 # Route configuration
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── backend/
│   ├── app.py                         # Main Flask application
│   ├── api.py                         # Disease prediction API
│   ├── database.py                    # MySQL database operations
│   ├── disease_predictor.py           # ML disease prediction engine
│   ├── train_model.py                 # Model training script
│   ├── models/                        # Trained ML models
│   └── requirements.txt               # Python dependencies
└── README.md
```

## 🎨 Design System

### Color Palette
- **Primary Teal**: `#4ECDC4` - Main brand color
- **Background**: `#E8F6F3` - Light teal background
- **Secondary**: `#45B7B8` - Darker teal variant
- **Accent**: `#26D0CE` - Bright teal accent
- **Text**: `#2C3E50` - Dark gray for readability

### Typography
- **Font Family**: Inter, system fonts
- **Heading Sizes**: 4xl, 3xl, 2xl, xl
- **Body Text**: Base size with proper contrast

## 🌐 Multi-Language Support

### Supported Languages
1. **English** - Primary language
2. **हिंदी (Hindi)** - Regional language support
3. **ਪੰਜਾਬੀ (Punjabi)** - Local language support

### Implementation
- Complete UI translation across all components
- Language selection persisted in localStorage
- Dynamic language switching without page reload
- Proper fallback to English for missing translations

## 🔬 Disease Prediction System

### Machine Learning Approach
- Uses Decision Tree classifier trained on symptom-disease patterns
- Provides confidence scores for predictions
- Features importance analysis for explanations
- Fallback to rule-based engine when ML model is unavailable

### API Endpoints
- **POST /api/v1/predict** - Disease prediction based on symptoms
- **GET /api/v1/model/status** - Model status information
- **GET /health** - Basic health check
- **POST /api/v1/train** - Model training endpoint (admin only)

### Canonical Symptom List
1. fever
2. headache
3. fatigue
4. dizziness
5. cough
6. shortness_breath
7. sore_throat
8. runny_nose
9. nausea
10. vomiting
11. stomach_pain
12. diarrhea
13. joint_pain
14. muscle_pain
15. back_pain
16. swelling
17. rash
18. itching
19. dry_skin
20. wounds

## 🔧 Key Components

### LanguageSelector
- Mandatory first-time language selection
- Teal-themed design with Digital Chikitsak branding
- Circular logo with medical caduceus symbol
- Language-specific app name display

### Voice Chat
- Speech recognition in multiple languages
- Text-to-speech synthesis
- Quick phrase selection
- Fallback text input

### Video Consultation
- Jitsi Meet integration
- HD video calling
- Screen sharing capabilities
- Multi-participant support
- Instant room creation based on patient name

### Pharmacy Finder
- Location-based pharmacy search
- Real-time stock information
- Operating hours and ratings
- Contact information

## 🧪 Testing

### Demo Credentials
- **Phone**: Any 10-digit number
- **PIN**: `1234`
- **Roles**: Patient or Doctor

### Feature Testing
1. Language selection on first visit
2. Visual symptom checker with disease prediction
3. Voice chat functionality
4. Video consultation setup
5. Pharmacy finder with geolocation
6. Family member management

## 🚀 Deployment

### Frontend
```bash
npm run build
# Deploy dist/ folder to web server
```

### Backend
```bash
# Set up Python environment
# Configure environment variables
# Deploy to cloud platform (AWS, Heroku, etc.)
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

Developed for rural healthcare accessibility in Punjab, India.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the codebase comments

---

**Digital Chikitsak** - Making healthcare accessible for everyone, everywhere."# Digital-Chikitsak" 
