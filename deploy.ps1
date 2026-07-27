# ForeverNote - Google Cloud Run Deployment Script (Windows PowerShell)
# Local Directory: C:\Users\KNK\Desktop\Forevernote-main V2.0

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "          ForeverNote - Fresh GCP Cloud Run Deployer      " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if gcloud CLI is installed
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] 'gcloud' command line tool was not found on your system." -ForegroundColor Red
    Write-Host "Please download and install the Google Cloud SDK from:" -ForegroundColor Yellow
    Write-Host "👉 https://cloud.google.com/sdk/docs/install" -ForegroundColor Cyan
    Exit
}

# 2. Authenticate user if not already logged in
Write-Host "Checking Google Cloud Authentication status..." -ForegroundColor Gray
$authCheck = gcloud auth list --format="value(account)" 2>$null
if ([string]::IsNullOrEmpty($authCheck)) {
    Write-Host "No active login found. Initiating secure login flow..." -ForegroundColor Yellow
    gcloud auth login
} else {
    Write-Host "Authenticated as: $authCheck" -ForegroundColor Green
}

# 3. Prompt for the new GCP Project ID
Write-Host ""
$projectID = Read-Host "Please enter your NEW Google Cloud Project ID"
if ([string]::IsNullOrWhiteSpace($projectID)) {
    Write-Host "[ERROR] Project ID cannot be empty." -ForegroundColor Red
    Exit
}

# 4. Configure gcloud to point to the new project ID
Write-Host "Setting active project configuration to: $projectID" -ForegroundColor Gray
gcloud config set project $projectID

# 5. Enable required services in the new GCP project
Write-Host "Ensuring Cloud Run & Cloud Build APIs are enabled for $projectID..." -ForegroundColor Gray
gcloud services enable run.googleapis.com cloudbuild.googleapis.com firestore.googleapis.com

# 6. Build and Deploy to Cloud Run
Write-Host ""
Write-Host "Deploying ForeverNote securely to Cloud Run..." -ForegroundColor Green
Write-Host "This will build your container in Cloud Build and host it on Cloud Run." -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Gray

gcloud run deploy forevernote `
    --source . `
    --region us-central1 `
    --platform managed `
    --allow-unauthenticated `
    --port 8080

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "🎉 Deployment command completed successfully!" -ForegroundColor Green
Write-Host "Check the output URL above to access your live production app!" -ForegroundColor Green
Write-Host "Note: Remember to configure your environment variables (such as GEMINI_API_KEY) in the Cloud Run service console if needed." -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green
