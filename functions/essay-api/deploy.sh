#!/bin/bash
# Deploy the essay API to Google Cloud Functions
# Run from: cd functions/essay-api && ./deploy.sh

set -e

PROJECT="nm-squad-492811"
REGION="asia-south1"
FUNCTION_NAME="essayApi"

echo "Deploying Essay API to Google Cloud Functions..."
echo "Project: $PROJECT"
echo "Region: $REGION"

# Deploy
gcloud functions deploy $FUNCTION_NAME \
  --project=$PROJECT \
  --region=$REGION \
  --runtime=nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --memory=256MB \
  --timeout=30s \
  --entry-point=essayApi \
  --source=.

echo ""
echo "Deployed! Function URL:"
gcloud functions describe $FUNCTION_NAME --project=$PROJECT --region=$REGION --format='value(httpsTrigger.url)'

echo ""
echo "Next steps:"
echo "1. Install xlsx for ingestion: npm install xlsx"
echo "2. Run ingestion: node ingest.js /path/to/Final_Essay_Submission_.xlsx"
echo "3. Update ESSAY_API_URL in apps/essay-feedback/src/App.jsx"
