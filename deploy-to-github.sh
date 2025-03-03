#\!/bin/bash

# Create a GitHub repository first:
# 1. Go to https://github.com/new
# 2. Name your repository (e.g., "leos-butterfly-quest")
# 3. Make it public or private as you prefer
# 4. Create repository without README, .gitignore, or license

# Replace with your GitHub username
USERNAME="yourusername"
# Replace with your repository name
REPO_NAME="leos-butterfly-quest"

# Navigate to your project directory
# cd /path/to/your/project

# Initialize git repository if not already initialized
if [ \! -d .git ]; then
  echo "Initializing git repository..."
  git init
fi

# Add all files
echo "Adding files to git..."
git add .

# Commit changes
echo "Committing files..."
git commit -m "Initial commit of Leo's Butterfly Quest"

# Add remote (replace with your actual GitHub username and repo name)
echo "Adding remote..."
git remote add origin "https://github.com/$USERNAME/$REPO_NAME.git"

# Push to GitHub
echo "Pushing to GitHub..."
git push -u origin main || git push -u origin master

echo ""
echo "======================================================"
echo "Done\! Your game is now on GitHub."
echo ""
echo "To enable GitHub Pages:"
echo "1. Go to https://github.com/$USERNAME/$REPO_NAME/settings"
echo "2. Scroll down to 'GitHub Pages' section"
echo "3. Under 'Source', select 'main' branch (or 'master')"
echo "4. Click 'Save'"
echo ""
echo "Once enabled, your game will be available at:"
echo "https://$USERNAME.github.io/$REPO_NAME/"
echo "======================================================"
