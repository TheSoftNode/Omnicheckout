const fs = require('fs')
const path = require('path')

// Create logs directory for backend
const logsDir = path.join(__dirname, 'backend', 'logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
  console.log('Created logs directory')
}

// Create data directory for backend
const dataDir = path.join(__dirname, 'backend', 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
  console.log('Created data directory')
}

console.log('Project setup completed successfully!')
console.log('')
console.log('Next steps:')
console.log('1. cd backend && npm install')
console.log('2. cp backend/.env.example backend/.env')
console.log('3. Edit backend/.env with your Circle API credentials')
console.log('4. cd frontend && npm install') 
console.log('5. cp frontend/.env.example frontend/.env.local')
console.log('6. npm run dev in both backend and frontend directories')
console.log('')
console.log('🚀 Your OmniCheckout project is ready!')
