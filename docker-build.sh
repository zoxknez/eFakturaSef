#!/bin/bash
# Docker build script with optimization and security scanning

set -e

# Build arguments
VERSION=${VERSION:-$(git describe --tags --always --dirty 2>/dev/null || echo "dev")}
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

IMAGE_NAME=${IMAGE_NAME:-"sef-efakture"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
DOCKERFILE=${DOCKERFILE:-"Dockerfile.optimized"}

echo "🏗️  Building Docker image..."
echo "   Name: $IMAGE_NAME:$IMAGE_TAG"
echo "   Version: $VERSION"
echo "   Build Date: $BUILD_DATE"
echo "   VCS Ref: $VCS_REF"
echo ""

# Build with BuildKit for better caching
DOCKER_BUILDKIT=1 docker build \
  --file "$DOCKERFILE" \
  --build-arg VERSION="$VERSION" \
  --build-arg BUILD_DATE="$BUILD_DATE" \
  --build-arg VCS_REF="$VCS_REF" \
  --tag "$IMAGE_NAME:$IMAGE_TAG" \
  --tag "$IMAGE_NAME:$VERSION" \
  --progress=plain \
  .

echo ""
echo "✅ Build completed successfully!"
echo "   Image: $IMAGE_NAME:$IMAGE_TAG"
echo "   Image: $IMAGE_NAME:$VERSION"
echo ""

# Display image size
echo "📦 Image size:"
docker images "$IMAGE_NAME:$IMAGE_TAG" --format "   {{.Repository}}:{{.Tag}} - {{.Size}}"
echo ""

# Optional: Run security scan with Trivy (if installed)
if command -v trivy &> /dev/null; then
  echo "🔍 Running security scan with Trivy..."
  trivy image --severity HIGH,CRITICAL "$IMAGE_NAME:$IMAGE_TAG"
else
  echo "⚠️  Trivy not installed. Skipping security scan."
  echo "   Install: https://github.com/aquasecurity/trivy"
fi

echo ""
echo "🚀 To run the container:"
echo "   docker run -p 3001:3001 --env-file .env $IMAGE_NAME:$IMAGE_TAG"

