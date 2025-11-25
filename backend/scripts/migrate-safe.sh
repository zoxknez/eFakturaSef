#!/bin/bash
# Safe database migration script with backup and rollback

set -e

echo "🔍 SEF eFakture - Safe Database Migration"
echo "========================================="
echo ""

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"
ENVIRONMENT="${NODE_ENV:-development}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL is not set!"
    exit 1
fi

# Parse DATABASE_URL
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

log_info "Environment: $ENVIRONMENT"
log_info "Database: $DB_NAME@$DB_HOST:$DB_PORT"
echo ""

# Step 1: Create backup directory
log_info "Creating backup directory..."
mkdir -p "$BACKUP_DIR"

# Step 2: Check Prisma migrations status
log_info "Checking migration status..."
npx prisma migrate status || {
    log_warn "There are pending migrations"
}
echo ""

# Step 3: Create database backup (production only)
if [ "$ENVIRONMENT" == "production" ]; then
    log_info "Creating database backup..."
    export PGPASSWORD="$DB_PASS"
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE" || {
        log_error "Backup failed!"
        exit 1
    }
    log_info "Backup created: $BACKUP_FILE"
    
    # Compress backup
    gzip "$BACKUP_FILE"
    log_info "Backup compressed: ${BACKUP_FILE}.gz"
    
    # Keep only last 10 backups
    log_info "Cleaning old backups (keeping last 10)..."
    ls -t ${BACKUP_DIR}/backup_*.sql.gz | tail -n +11 | xargs -r rm --
else
    log_warn "Skipping backup in non-production environment"
fi
echo ""

# Step 4: Dry run (check what will be applied)
log_info "Checking pending migrations (dry run)..."
npx prisma migrate status
echo ""

# Step 5: Confirm (in production)
if [ "$ENVIRONMENT" == "production" ]; then
    read -p "⚠️  Apply migrations to PRODUCTION database? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        log_warn "Migration cancelled by user"
        exit 0
    fi
fi

# Step 6: Apply migrations
log_info "Applying migrations..."
npx prisma migrate deploy || {
    log_error "Migration failed!"
    
    # Offer rollback in production
    if [ "$ENVIRONMENT" == "production" ] && [ -f "${BACKUP_FILE}.gz" ]; then
        read -p "🔙 Rollback to backup? (yes/no): " -r
        echo
        if [[ $REPLY =~ ^[Yy]es$ ]]; then
            log_info "Rolling back to backup..."
            gunzip -c "${BACKUP_FILE}.gz" | PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
            log_info "Rollback completed"
        fi
    fi
    exit 1
}

log_info "✅ Migrations applied successfully!"
echo ""

# Step 7: Verify migration
log_info "Verifying database schema..."
npx prisma migrate status
echo ""

# Step 8: Generate Prisma client
log_info "Generating Prisma client..."
npx prisma generate
echo ""

log_info "✅ Migration process completed successfully!"
echo ""
log_info "Backup location: ${BACKUP_FILE}.gz"



