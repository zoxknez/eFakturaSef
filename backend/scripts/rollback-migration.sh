#!/bin/bash
# Rollback database to a previous backup

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"

echo "🔙 SEF eFakture - Database Rollback"
echo "==================================="
echo ""

# List available backups
echo "Available backups:"
ls -lht ${BACKUP_DIR}/backup_*.sql.gz | head -10
echo ""

# Prompt for backup file
read -p "Enter backup filename (or 'latest' for most recent): " BACKUP_CHOICE

if [ "$BACKUP_CHOICE" == "latest" ]; then
    BACKUP_FILE=$(ls -t ${BACKUP_DIR}/backup_*.sql.gz | head -1)
else
    BACKUP_FILE="${BACKUP_DIR}/${BACKUP_CHOICE}"
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Selected backup: $BACKUP_FILE"
echo ""

# Parse DATABASE_URL
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Confirm
read -p "⚠️  This will REPLACE the current database. Continue? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    echo "Rollback cancelled"
    exit 0
fi

echo "🔄 Rolling back database..."

# Drop and recreate database
export PGPASSWORD="$DB_PASS"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "DROP DATABASE IF EXISTS ${DB_NAME};"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE ${DB_NAME};"

# Restore from backup
gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

echo "✅ Database rolled back successfully!"
echo ""
echo "⚠️  Remember to:"
echo "  1. Run 'npx prisma generate' to update Prisma client"
echo "  2. Restart the application"
echo "  3. Test thoroughly before resuming operations"



