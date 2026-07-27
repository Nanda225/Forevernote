#!/bin/bash
# ForeverNote - Google Cloud Run Deployment Script (Bash / Git Bash)
# Local Directory: C:\Users\KNK\Desktop\Forevernote-main V2.0

set -e

# Colors
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0;37m' # No Color

echo -e "${CYAN}==========================================================${NC}"
echo -e "${CYAN}          ForeverNote - Fresh GCP Cloud Run Deployer      ${NC}"
echo -e "${CYAN}==========================================================${NC}"
echo -e ""

# 1. Check if gcloud CLI is installed
if ! [ -x "$(command -v gcloud)" ]; then
  echo -e "${RED}[ERROR] 'gcloud' command line tool was not found on your system.${NC}"
  echo -e "Please download and install the Google Cloud SDK from:"
  echo -e "👉 ${CYAN}https://cloud.google.com/sdk/docs/install${NC}"
  exit 1
fi

# 2. Authenticate user if not already logged in
echo -e "Checking Google Cloud Authentication status..."
AUTH_CHECK=$(gcloud auth list --format="value(account)" 2>/dev/null)
if [ -z "$AUTH_CHECK" ]; then
  echo -e "${YELLOW}No active login found. Initiating secure login flow...${NC}"
  gcloud auth login
else
  echo -e "Authenticated as: ${GREEN}$AUTH_CHECK${NC}"
fi

# 3. Prompt for the new GCP Project ID
echo ""
echo -e -n "${YELLOW}Please enter your NEW Google Cloud Project ID: ${NC}"
read -r PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}[ERROR] Project ID cannot be empty.${NC}"
  exit 1
fi

# 4. Configure gcloud to point to the new project ID
echo -e "Setting active project configuration to: ${CYAN}$PROJECT_ID${NC}..."
gcloud config set project "$PROJECT_ID"

# 5. Enable required services in the new GCP project
echo -e "Ensuring Cloud Run & Cloud Build APIs are enabled for ${CYAN}$PROJECT_ID${NC}..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com firestore.googleapis.com

# 6. Build and Deploy to Cloud Run
echo -e ""
echo -e "${GREEN}Deploying ForeverNote securely to Cloud Run...${NC}"
echo -e "This will build your container in Cloud Build and host it on Cloud Run."
echo -e "${CYAN}==========================================================${NC}"

gcloud run deploy forevernote \
    --source . \
    --region us-central1 \
    --platform managed \
    --allow-unauthenticated \
    --port 8080

echo -e ""
echo -e "${CYAN}==========================================================${NC}"
echo -e "${GREEN}🎉 Deployment command completed successfully!${NC}"
echo -e "Check the output URL above to access your live production app!"
echo -e "Note: Remember to configure your environment variables (such as GEMINI_API_KEY) in the Cloud Run service console if needed."
echo -e "${CYAN}==========================================================${NC}"
