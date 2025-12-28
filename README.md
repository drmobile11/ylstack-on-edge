# Clone the repository
git clone <your-repo-url>
cd edge-starter-kit

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Initialize database
npm run db:push

# Start development server
npm run dev