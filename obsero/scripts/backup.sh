# Container Log Manager Backup Script

set -e

# Configuration
BACKUP_DIR="./backups"
DATA_DIR="./data"
RETENTION_DAYS=30

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Create backup
create_backup() {
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_name="log-manager-backup-$timestamp"
    
    log_info "Creating backup: $backup_name"
    
    mkdir -p "$BACKUP_DIR"
    
    # Create compressed backup
    tar -czf "$BACKUP_DIR/$backup_name.tar.gz" \
        -C "$DATA_DIR" . \
        --exclude="*.tmp" \
        --exclude="*.lock"
    
    log_info "Backup created: $BACKUP_DIR/$backup_name.tar.gz"
    
    # Calculate backup size
    local size=$(du -h "$BACKUP_DIR/$backup_name.tar.gz" | cut -f1)
    log_info "Backup size: $size"
}

# Clean old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."
    
    find "$BACKUP_DIR" -name "log-manager-backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    local remaining=$(find "$BACKUP_DIR" -name "log-manager-backup-*.tar.gz" | wc -l)
    log_info "Remaining backups: $remaining"
}

# Restore backup
restore_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        echo "Usage: $0 restore <backup-file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_warn "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_info "Restoring backup: $backup_file"
    
    # Stop application
    docker-compose down
    
    # Backup current data
    if [ -d "$DATA_DIR" ]; then
        mv "$DATA_DIR" "$DATA_DIR.backup.$(date +%Y%m%d-%H%M%S)"
    fi
    
    # Restore data
    mkdir -p "$DATA_DIR"
    tar -xzf "$backup_file" -C "$DATA_DIR"
    
    # Restart application
    docker-compose up -d
    
    log_info "Backup restored successfully"
}

# List backups
list_backups() {
    log_info "Available backups:"
    ls -lh "$BACKUP_DIR"/log-manager-backup-*.tar.gz 2>/dev/null || log_warn "No backups found"
}

# Main
case "${1:-backup}" in
    "backup")
        create_backup
        cleanup_old_backups
        ;;
    "restore")
        restore_backup "$2"
        ;;
    "list")
        list_backups
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    *)
        echo "Usage: $0 {backup|restore <file>|list|cleanup}"
        exit 1
        ;;
esac
